#!/usr/bin/env python3
"""Read-only checks for the documented Vercel / Render / Neon demo topology."""

import argparse
from http.client import HTTPException
import ipaddress
import json
import os
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, unquote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class CheckFailed(Exception):
    """Messages must describe the setting, never include its value or a response."""


def require(condition, message):
    if not condition:
        raise CheckFailed(message)


def remote_host(host):
    if not host or "." not in host or not re.fullmatch(r"[a-z0-9.-]+", host):
        return False
    if host.endswith((".localhost", ".local", ".example", ".invalid", ".test")):
        return False
    if host in {"example.com", "example.org", "example.net"} or host.startswith("your-"):
        return False
    try:
        return ipaddress.ip_address(host).is_global
    except ValueError:
        return (not host.rsplit(".", 1)[-1].isdigit()
                and all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", part) for part in host.split(".")))


def origin(value, label):
    try:
        parsed = urlsplit(value)
        valid = (
            value == value.strip() and not any(char.isspace() for char in value)
            and parsed.scheme == "https" and remote_host(parsed.hostname)
            and parsed.port in (None, 443) and parsed.username is None
            and parsed.password is None and parsed.path in ("", "/")
            and not parsed.query and not parsed.fragment
        )
    except ValueError:
        valid = False
    require(valid, f"{label}: use a real HTTPS origin, without credentials, path, query or fragment")
    return f"https://{parsed.hostname}"


def required(env, name):
    value = env.get(name, "")
    require(bool(value.strip()) and "<" not in value and ">" not in value,
            f"{name}: required; replace the placeholder in the provider environment")
    return value


def check_frontend(env):
    require(required(env, "NEXT_PUBLIC_API_BASE_URL") == "/",
            "NEXT_PUBLIC_API_BASE_URL: use / for the hosted browser proxy")
    backend = origin(required(env, "NEXORA_API_BASE_URL"), "NEXORA_API_BASE_URL")
    site = origin(required(env, "NEXT_PUBLIC_SITE_URL"), "NEXT_PUBLIC_SITE_URL")
    require(backend != site, "NEXORA_API_BASE_URL: must target Render, not the frontend (rewrite loop)")
    for name in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
        if env.get(name):
            require(backend != origin("https://" + env[name], name),
                    "NEXORA_API_BASE_URL: must not target a Vercel frontend alias")
    for name in env:
        if name.startswith("NEXT_PUBLIC_") and re.search(r"SECRET|PASSWORD|TOKEN|CREDENTIAL|API_KEY|DB_URL|DATABASE", name):
            raise CheckFailed("NEXT_PUBLIC_*: remove credential/database variables from the browser environment")


def check_jdbc(value):
    require(value.startswith("jdbc:postgresql://"), "NEXORA_DB_URL: use a PostgreSQL JDBC URL")
    try:
        parsed = urlsplit(value[5:])
        params = parse_qs(parsed.query, keep_blank_values=True)
        valid = (
            parsed.scheme == "postgresql" and remote_host(parsed.hostname)
            and parsed.port in (None, 5432) and parsed.username is None
            and parsed.password is None and not parsed.fragment
            and re.fullmatch(r"/[^/\s]+", parsed.path)
            and not any(char.isspace() for char in value)
        )
    except ValueError:
        valid = False
    require(valid, "NEXORA_DB_URL: use one external host/database; keep credentials in separate variables")
    require("-pooler" not in parsed.hostname, "NEXORA_DB_URL: use Neon's direct endpoint for startup Flyway migrations")
    require(set(params) <= {"sslmode", "channelBinding"},
            "NEXORA_DB_URL: this demo check accepts only sslmode/channelBinding parameters; keep credentials separate")
    require(params.get("sslmode") in (["require"], ["verify-ca"], ["verify-full"]),
            "NEXORA_DB_URL: TLS is required; use sslmode=require or a verified certificate mode")
    require(params.get("channelBinding") == ["require"],
            "NEXORA_DB_URL: keep channelBinding=require from the Neon JDBC settings")
    require(not any(char in unquote(parsed.path) for char in "@?&#<>"),
            "NEXORA_DB_URL: invalid database name or unfilled placeholder")


def check_backend(env):
    require(required(env, "SPRING_PROFILES_ACTIVE") == "hosted-demo",
            "SPRING_PROFILES_ACTIVE: use exactly hosted-demo")
    port = required(env, "PORT")
    require(port.isascii() and port.isdigit() and 1 <= int(port) <= 65535,
            "PORT: must be a valid TCP port supplied by the host")
    check_jdbc(required(env, "NEXORA_DB_URL"))
    require(required(env, "NEXORA_DB_USERNAME").strip().lower() not in {"postgres", "nexora_user"},
            "NEXORA_DB_USERNAME: use a dedicated non-default database role")
    for name, minimum in (("NEXORA_DB_PASSWORD", 16), ("NEXORA_JWT_SECRET", 48), ("NEXORA_REFRESH_TOKEN_HASH_SECRET", 48)):
        value = required(env, name)
        require(len(value.encode("utf-8")) >= minimum, f"{name}: must contain at least {minimum} bytes")
        require(not re.search(r"(?i)(^|[^a-z0-9])(local|test|example|password|placeholder|dummy|temporary)([^a-z0-9]|$)|changeme|replace.me", value),
                f"{name}: replace local/test/placeholder credentials")
    require(env["NEXORA_JWT_SECRET"] != env["NEXORA_REFRESH_TOKEN_HASH_SECRET"],
            "JWT and refresh-token hash secrets must be independent")
    for item in required(env, "NEXORA_AUTH_TRUSTED_ORIGINS").split(","):
        origin(item.strip(), "NEXORA_AUTH_TRUSTED_ORIGINS")
    for name in ("NEXORA_REFRESH_TOKEN_COOKIE_SAME_SITE", "NEXORA_AUTH_CSRF_COOKIE_SAME_SITE"):
        require(env.get(name, "Lax").lower() == "lax", f"{name}: retain Lax for this same-origin proxy setup")
    for name in ("NEXORA_REFRESH_TOKEN_COOKIE_SECURE", "NEXORA_AUTH_CSRF_COOKIE_SECURE", "NEXORA_AUTH_CSRF_ENABLED"):
        require(env.get(name, "true").lower() == "true", f"{name}: remove the conflicting insecure override")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise CheckFailed("redirect refused; check the canonical origin and deployment protection")


def read_json(base, path, expected_status, timeout):
    # No cookie jar, Authorization, mutation requests, redirect following or raw logging.
    request = Request(base + path, headers={"Accept": "application/json"}, method="GET")
    try:
        try:
            response = build_opener(NoRedirect()).open(request, timeout=timeout)
        except HTTPError as error:
            response = error
        with response:
            require(response.code == expected_status,
                    f"{path}: expected HTTP {expected_status}, received HTTP {response.code}")
            require(response.headers.get_content_type() == "application/json", f"{path}: expected JSON, not a hosting/login page")
            body = response.read(2 * 1024 * 1024 + 1)
            require(len(body) <= 2 * 1024 * 1024, f"{path}: response exceeds the check's size limit")
            return json.loads(body)
    except (URLError, OSError, HTTPException):
        raise CheckFailed(f"{path}: network/TLS failure or timeout; check service startup") from None
    except (ValueError, UnicodeError):
        raise CheckFailed(f"{path}: invalid JSON response") from None


def check_public(base, timeout):
    health = read_json(base, "/api/health", 200, timeout)
    require(isinstance(health, dict), "/api/health: invalid health response")
    checks = health.get("checks")
    require(health.get("status") == "UP" and health.get("service") == "NEXORA API",
            "/api/health: NEXORA API is not reporting UP")
    require(health.get("runtimeMode") == "production" and health.get("dataMode") == "postgres-dev"
            and isinstance(checks, dict) and checks.get("authProductionGuard") == "active",
            "/api/health: hosted persistence/production guard is missing; UP alone is insufficient")
    for path in ("/api/deals", "/api/giveaways"):
        require(isinstance(read_json(base, path, 200, timeout), list), f"{path}: expected a catalog array")
    denied = read_json(base, "/api/me/wishlist", 401, timeout)
    require(isinstance(denied, dict) and denied.get("error") == "authentication_required",
            "/api/me/wishlist: unauthenticated access must remain denied")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest="mode", required=True)
    env_parser = modes.add_parser("env", help="validate exported variables offline; print no values")
    env_parser.add_argument("target", choices=("frontend", "backend"))
    public_parser = modes.add_parser("public", help="GET-only checks of both actual hosted origins")
    public_parser.add_argument("--frontend-url", required=True)
    public_parser.add_argument("--backend-url", required=True)
    public_parser.add_argument("--timeout", type=int, choices=range(1, 121), default=60, metavar="1..120")
    args = parser.parse_args(argv)
    try:
        if args.mode == "env":
            (check_frontend if args.target == "frontend" else check_backend)(os.environ)
            print(f"PASS: {args.target} environment shape (values redacted; no network requests)")
            print("Startup guards, actual DNS/proxy routing and browser cookie checks still apply.")
        else:
            frontend = origin(args.frontend_url, "frontend URL")
            backend = origin(args.backend_url, "backend URL")
            require(frontend != backend, "Supply distinct frontend and backend origins")
            for name, base in (("backend", backend), ("frontend proxy", frontend)):
                check_public(base, args.timeout)
                print(f"PASS: {name} health mode, public catalogs and protected wishlist denial")
            print("Read-only checks passed. DB liveness, signed-in persistence and cookies still need validation.")
    except CheckFailed as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
