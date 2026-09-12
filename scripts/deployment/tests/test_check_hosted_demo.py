"""Offline deployment-check regressions; no real credentials or hosted requests."""

from contextlib import redirect_stderr, redirect_stdout
from email.message import Message
from http.client import IncompleteRead
import importlib.util
import io
import json
from pathlib import Path
import secrets
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

SPEC = importlib.util.spec_from_file_location("hosted_check", Path(__file__).parents[1] / "check-hosted-demo.py")
check = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check)


def frontend_env():
    return {"NEXT_PUBLIC_API_BASE_URL": "/", "NEXORA_API_BASE_URL": "https://nexora-api.onrender.com",
            "NEXT_PUBLIC_SITE_URL": "https://nexora.vercel.app"}


def backend_env():
    return {"SPRING_PROFILES_ACTIVE": "hosted-demo", "PORT": "10000",
            "NEXORA_DB_URL": "jdbc:postgresql://ep-nexora.eu-central-1.aws.neon.tech/demo?sslmode=require&channelBinding=require",
            "NEXORA_DB_USERNAME": "demo_owner", "NEXORA_DB_PASSWORD": secrets.token_hex(24),
            "NEXORA_JWT_SECRET": secrets.token_hex(32), "NEXORA_REFRESH_TOKEN_HASH_SECRET": secrets.token_hex(32),
            "NEXORA_AUTH_TRUSTED_ORIGINS": "https://nexora.vercel.app"}


class EnvironmentTests(unittest.TestCase):
    def test_valid_environments(self):
        check.check_frontend(frontend_env())
        check.check_backend(backend_env())

    def test_frontend_bad_settings(self):
        for name, value in (("NEXT_PUBLIC_API_BASE_URL", "https://nexora-api.onrender.com"),
                            ("NEXORA_API_BASE_URL", "https://nexora.vercel.app/"),
                            ("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
                            ("NEXT_PUBLIC_API_KEY", "must-not-be-public"),
                            ("VERCEL_URL", "nexora-api.onrender.com")):
            with self.subTest(name=name), self.assertRaises(check.CheckFailed):
                check.check_frontend({**frontend_env(), name: value})

    def test_origin_rejects_unsafe_or_placeholder_values(self):
        for value in ("https://user:private@nexora.vercel.app", "https://nexora.vercel.app/api",
                      "https://nexora.vercel.app?private=value", "https://nexora.vercel.app#fragment",
                      "https://127.1", "https://127.0.0.1", "https://10.0.0.1", "https://example.com",
                      "https://<render-host>", "https://nexora.vercel.app:8080", " https://nexora.vercel.app"):
            with self.subTest(value=value), self.assertRaises(check.CheckFailed):
                check.origin(value, "URL")

    def test_backend_missing_and_unsafe_settings(self):
        env = backend_env()
        for name in env:
            with self.subTest(missing=name), self.assertRaises(check.CheckFailed):
                check.check_backend({**env, name: ""})
        for name, value in (("SPRING_PROFILES_ACTIVE", "production"), ("PORT", "65536"),
                            ("NEXORA_DB_USERNAME", "postgres"), ("NEXORA_DB_PASSWORD", "short"),
                            ("NEXORA_JWT_SECRET", "<replace-secret>"),
                            ("NEXORA_REFRESH_TOKEN_HASH_SECRET", env["NEXORA_JWT_SECRET"]),
                            ("NEXORA_AUTH_TRUSTED_ORIGINS", "https://*.vercel.app"),
                            ("NEXORA_AUTH_CSRF_ENABLED", "false"),
                            ("NEXORA_REFRESH_TOKEN_COOKIE_SAME_SITE", "None")):
            with self.subTest(name=name), self.assertRaises(check.CheckFailed):
                check.check_backend({**env, name: value})

    def test_jdbc_requires_direct_tls_and_separate_credentials(self):
        url = backend_env()["NEXORA_DB_URL"]
        for invalid in (url.replace("ep-nexora.", "ep-nexora-pooler."), url.replace("require", "disable"),
                        url.split("?")[0], url.replace("&channelBinding=require", ""),
                        url + "&user=private", url + "&password=private", url + "&sslmode=disable",
                        url.replace("//ep-", "//private:private@ep-"), url.replace("jdbc:", "")):
            with self.subTest(url=invalid), self.assertRaises(check.CheckFailed):
                check.check_jdbc(invalid)

    def test_cli_redacts_values_on_success_and_failure(self):
        env = backend_env()
        for valid in (True, False):
            if not valid:
                env["NEXORA_DB_URL"] += "&password=" + env["NEXORA_DB_PASSWORD"]
            output = io.StringIO()
            with patch.dict(check.os.environ, env, clear=True), redirect_stdout(output), redirect_stderr(output):
                self.assertEqual(check.main(["env", "backend"]), 0 if valid else 1)
            for name in ("NEXORA_DB_URL", "NEXORA_DB_PASSWORD", "NEXORA_JWT_SECRET", "NEXORA_REFRESH_TOKEN_HASH_SECRET"):
                self.assertNotIn(env[name], output.getvalue())


class PublicTests(unittest.TestCase):
    def test_real_health_modes_and_empty_catalogs(self):
        health = {"status": "UP", "service": "NEXORA API", "runtimeMode": "production",
                  "dataMode": "postgres-dev", "activeProfiles": ["custom", "dev", "production"],
                  "checks": {"authProductionGuard": "active"}}
        with patch.object(check, "read_json", side_effect=[health, [], [], {"error": "authentication_required"}]) as read:
            check.check_public("https://nexora.vercel.app", 60)
            self.assertEqual(read.call_args_list[-1].args[1:3], ("/api/me/wishlist", 401))
        for changed in ({"runtimeMode": "demo"}, {"dataMode": "in-memory-demo"}, {"checks": {}}, {"status": "DOWN"}):
            with self.subTest(changed=changed), patch.object(check, "read_json", return_value={**health, **changed}):
                with self.assertRaises(check.CheckFailed):
                    check.check_public("https://nexora.vercel.app", 60)

    def test_json_http_errors_are_read_for_expected_denial(self):
        headers = Message()
        headers["Content-Type"] = "application/json"
        error = HTTPError("https://nexora.vercel.app/api/me/wishlist", 401, "Unauthorized", headers,
                          io.BytesIO(json.dumps({"error": "authentication_required"}).encode()))
        with patch.object(check, "build_opener") as opener:
            opener.return_value.open.side_effect = error
            self.assertEqual(check.read_json("https://nexora.vercel.app", "/api/me/wishlist", 401, 60),
                             {"error": "authentication_required"})
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.get_method(), "GET")
            self.assertEqual(request.headers, {"Accept": "application/json"})

    def test_response_and_transport_failures_do_not_leak(self):
        for content_type, body, code in (("text/html", b"private hosting page", 200),
                                         ("application/json", b"private invalid JSON", 200),
                                         ("application/json", b"private server error", 503),
                                         ("application/json", b"x" * (2 * 1024 * 1024 + 1), 200)):
            response = io.BytesIO(body)
            response.code = code
            response.headers = Message()
            response.headers["Content-Type"] = content_type
            with patch.object(check, "build_opener") as opener:
                opener.return_value.open.return_value = response
                with self.assertRaises(check.CheckFailed) as failed:
                    check.read_json("https://nexora.vercel.app", "/api/health", 200, 60)
                self.assertNotIn("private", str(failed.exception))
        for error in (URLError("private transport info"), IncompleteRead(b"private partial response")):
            with patch.object(check, "build_opener") as opener:
                opener.return_value.open.side_effect = error
                with self.assertRaises(check.CheckFailed) as failed:
                    check.read_json("https://nexora.vercel.app", "/api/health", 200, 60)
                self.assertNotIn("private", str(failed.exception))

    def test_redirect_is_never_followed(self):
        with self.assertRaises(check.CheckFailed):
            check.NoRedirect().redirect_request(None, None, 302, "private", {}, "https://unrelated.invalid/private")


if __name__ == "__main__":
    unittest.main()
