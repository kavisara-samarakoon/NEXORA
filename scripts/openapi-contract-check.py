#!/usr/bin/env python3
"""Lightweight structural checks for NEXORA's hand-maintained OpenAPI file."""

from pathlib import Path
import re
import sys


DEFAULT_CONTRACT = Path("docs/api/openapi.yaml")
EXPECTED_INFO_VERSION = "0.38.0"
EXPECTED_PATH_COUNT = 23
EXPECTED_OPERATION_COUNT = 25

EXPECTED_PATHS = {
    "/api",
    "/api/health",
    "/api/deals",
    "/api/deals/external",
    "/api/giveaways",
    "/api/wishlist",
    "/api/dashboard/summary",
    "/api/security/status",
    "/api/sentinel/status",
    "/api/sentinel/demo",
    "/api/auth/csrf",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/me/wishlist",
    "/api/me/wishlist/alert-events",
    "/api/me/wishlist/{id}/price-history",
    "/api/me/wishlist/{id}/alert",
    "/api/me/wishlist/{id}",
    "/api/me/notification-preferences",
    "/api/me/sentinel/insight",
}

EXPECTED_OPERATION_IDS = {
    "getApiWelcome",
    "getRuntimeHealth",
    "listDeals",
    "listExternalDeals",
    "listGiveaways",
    "listPublicWishlist",
    "getDashboardSummary",
    "getSecurityStatus",
    "getSentinelStatus",
    "getSentinelDemo",
    "issueAuthCsrfToken",
    "registerAccount",
    "loginAccount",
    "refreshAuthSession",
    "logoutAuthSession",
    "getCurrentAccount",
    "listCurrentUserWishlist",
    "addCurrentUserWishlistItem",
    "listCurrentUserWishlistAlertEvents",
    "listCurrentUserWishlistPriceHistory",
    "updateCurrentUserWishlistAlert",
    "deleteCurrentUserWishlistItem",
    "getCurrentUserNotificationPreferences",
    "updateCurrentUserNotificationPreferences",
    "requestCurrentUserSentinelInsight",
}

REQUIRED_SCHEMAS = {
    "WelcomeResponse",
    "HealthResponse",
    "Deal",
    "Giveaway",
    "DashboardSummary",
    "SecurityStatusResponse",
    "SentinelStatusResponse",
    "SentinelDemoResponse",
    "AuthCsrfTokenResponse",
    "RegisterRequest",
    "LoginRequest",
    "AuthResponse",
    "AuthUserResponse",
    "AddWishlistItemRequest",
    "UpdateWishlistAlertRequest",
    "WishlistItem",
    "WishlistAlertEventResponse",
    "WishlistPriceHistoryPoint",
    "NotificationPreferenceResponse",
    "UpdateNotificationPreferenceRequest",
    "SentinelInsightRequest",
    "SentinelInsightResponse",
    "ApiErrorResponse",
}

REQUIRED_SECURITY_SCHEMES = {
    "BearerAuth",
    "CsrfTokenHeader",
    "CsrfCookie",
    "RefreshCookie",
}

REQUIRED_ERROR_CODES = {
    "authentication_required",
    "authentication_failed",
    "account_conflict",
    "csrf_failed",
    "rate_limited",
    "rate_limit_exceeded",
    "validation_failed",
    "wishlist_item_not_found",
    "internal_error",
}

PRODUCTION_URL_MARKERS = {
    "https://nexora",
    "vercel.app",
    "railway.app",
    "render.com",
    "fly.dev",
    "herokuapp.com",
    "api.nexora",
}


class CheckResult:
    """Collect readable check output while preserving a non-zero failure result."""

    def __init__(self) -> None:
        self.failures = 0

    def pass_check(self, message: str) -> None:
        print(f"PASS: {message}")

    def fail_check(self, message: str) -> None:
        self.failures += 1
        print(f"FAIL: {message}", file=sys.stderr)

    def require(self, condition: bool, success: str, failure: str) -> None:
        if condition:
            self.pass_check(success)
        else:
            self.fail_check(failure)


def extract_block(text: str, start: str, end: str | None = None) -> str | None:
    """Return a top-level YAML text block without parsing YAML."""
    if end is None:
        pattern = rf"^{re.escape(start)}[ \t]*\n(?P<body>.*)\Z"
    else:
        pattern = (
            rf"^{re.escape(start)}[ \t]*\n"
            rf"(?P<body>.*?)(?=^{re.escape(end)}[ \t]*$)"
        )
    match = re.search(pattern, text, flags=re.MULTILINE | re.DOTALL)
    return match.group("body") if match else None


def compare_markers(
    result: CheckResult,
    actual: set[str],
    expected: set[str],
    label: str,
) -> None:
    """Report missing or unexpected markers as one understandable result."""
    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)
    if not missing and not unexpected:
        result.pass_check(f"{label} verified: {len(expected)}")
        return

    details = []
    if missing:
        details.append(f"missing {', '.join(missing)}")
    if unexpected:
        details.append(f"unexpected {', '.join(unexpected)}")
    result.fail_check(f"{label} differ ({'; '.join(details)})")


def check_contract(contract_path: Path) -> int:
    result = CheckResult()

    try:
        text = contract_path.read_text(encoding="utf-8")
    except OSError as error:
        result.fail_check(f"Could not read {contract_path}: {error}")
        return 1

    result.pass_check(f"Read OpenAPI contract: {contract_path}")

    result.require(
        re.search(r"^openapi: 3\.1\.0[ \t]*$", text, re.MULTILINE) is not None,
        "OpenAPI version marker is 3.1.0",
        "Missing exact 'openapi: 3.1.0' marker",
    )
    result.require(
        re.search(r"^  title: NEXORA Backend API[ \t]*$", text, re.MULTILINE)
        is not None,
        "API title marker is NEXORA Backend API",
        "Missing exact 'title: NEXORA Backend API' marker",
    )
    result.require(
        re.search(
            rf"^  version: {re.escape(EXPECTED_INFO_VERSION)}[ \t]*$",
            text,
            re.MULTILINE,
        )
        is not None,
        f"OpenAPI info version marker is {EXPECTED_INFO_VERSION}",
        f"Missing exact OpenAPI info version {EXPECTED_INFO_VERSION}",
    )

    server_urls = re.findall(r"^\s*- url:\s*(\S+)[ \t]*$", text, re.MULTILINE)
    result.require(
        server_urls == ["http://localhost:8080"],
        "Only the localhost Spring Boot server is documented",
        "Server URLs must contain only http://localhost:8080",
    )

    production_markers = sorted(
        marker for marker in PRODUCTION_URL_MARKERS if marker in text.lower()
    )
    result.require(
        not production_markers,
        "No production URL markers found",
        f"Production URL markers found: {', '.join(production_markers)}",
    )

    paths_block = extract_block(text, "paths:", "components:")
    if paths_block is None:
        result.fail_check("Could not locate the top-level paths block")
    else:
        paths = re.findall(
            r"^  (/api(?:/[A-Za-z0-9_{}-]+)*):[ \t]*$",
            paths_block,
            re.MULTILINE,
        )
        result.require(
            len(paths) == EXPECTED_PATH_COUNT,
            f"OpenAPI path count: {len(paths)}",
            f"Expected {EXPECTED_PATH_COUNT} OpenAPI paths, found {len(paths)}",
        )
        compare_markers(result, set(paths), EXPECTED_PATHS, "Required paths")

        operations = re.findall(
            r"^    (get|post|patch|delete):[ \t]*$",
            paths_block,
            re.MULTILINE,
        )
        result.require(
            len(operations) == EXPECTED_OPERATION_COUNT,
            f"OpenAPI operation count: {len(operations)}",
            (
                f"Expected {EXPECTED_OPERATION_COUNT} GET/POST/PATCH/DELETE "
                f"operations, found {len(operations)}"
            ),
        )

        operation_ids = re.findall(
            r"^      operationId:\s*([A-Za-z][A-Za-z0-9]*)[ \t]*$",
            paths_block,
            re.MULTILINE,
        )
        result.require(
            len(operation_ids) == len(set(operation_ids)),
            "Operation IDs are unique",
            "Duplicate operationId values found",
        )
        compare_markers(
            result,
            set(operation_ids),
            EXPECTED_OPERATION_IDS,
            "Required operationIds",
        )

    security_block = extract_block(
        text, "  securitySchemes:", "  parameters:"
    )
    if security_block is None:
        result.fail_check("Could not locate components.securitySchemes")
    else:
        security_markers = {
            name
            for name in REQUIRED_SECURITY_SCHEMES
            if re.search(
                rf"^    {re.escape(name)}:[ \t]*$",
                security_block,
                re.MULTILINE,
            )
        }
        compare_markers(
            result,
            security_markers,
            REQUIRED_SECURITY_SCHEMES,
            "Required security schemes",
        )

    schemas_block = extract_block(text, "  schemas:")
    if schemas_block is None:
        result.fail_check("Could not locate components.schemas")
    else:
        schema_markers = {
            name
            for name in REQUIRED_SCHEMAS
            if re.search(
                rf"^    {re.escape(name)}:[ \t]*$",
                schemas_block,
                re.MULTILINE,
            )
        }
        compare_markers(
            result,
            schema_markers,
            REQUIRED_SCHEMAS,
            "Required schema markers",
        )

        error_codes = {
            code
            for code in REQUIRED_ERROR_CODES
            if re.search(
                rf"^            - {re.escape(code)}[ \t]*$",
                schemas_block,
                re.MULTILINE,
            )
        }
        compare_markers(
            result,
            error_codes,
            REQUIRED_ERROR_CODES,
            "Required error codes",
        )

    required_contract_markers = {
        "ApiErrorResponse": r"^    ApiErrorResponse:[ \t]*$",
        "retryAfterSeconds": r"^        retryAfterSeconds:[ \t]*$",
        "Retry-After": r"^        Retry-After:[ \t]*$",
    }
    missing_contract_markers = [
        name
        for name, pattern in required_contract_markers.items()
        if re.search(pattern, text, re.MULTILINE) is None
    ]
    result.require(
        not missing_contract_markers,
        "ApiErrorResponse, retryAfterSeconds, and Retry-After markers verified",
        f"Missing error-contract markers: {', '.join(missing_contract_markers)}",
    )

    if result.failures:
        print(
            f"NEXORA OpenAPI contract check failed with {result.failures} issue(s).",
            file=sys.stderr,
        )
        return 1

    print("NEXORA OpenAPI contract check passed.")
    return 0


def main() -> int:
    if len(sys.argv) > 2:
        print(
            "FAIL: Usage: scripts/openapi-contract-check.py [openapi-file]",
            file=sys.stderr,
        )
        return 2

    contract_path = Path(sys.argv[1]) if len(sys.argv) == 2 else DEFAULT_CONTRACT
    return check_contract(contract_path)


if __name__ == "__main__":
    raise SystemExit(main())
