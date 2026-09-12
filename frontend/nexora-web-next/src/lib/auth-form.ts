// Only known product routes are accepted; user input never becomes an arbitrary redirect.
const returnRoutes = new Set(["/", "/deals", "/giveaways", "/wishlist", "/sentinel", "/security", "/settings"]);

export function productReturnTo(value: string | string[] | undefined): string {
  return typeof value === "string" && returnRoutes.has(value) ? value : "/wishlist";
}

export function authFieldError(name: string, value: string, mode: "login" | "register"): string {
  if (!value.trim()) {
    const labels: Record<string, string> = {
      displayName: "a display name", username: "a username", email: "an email address",
      emailOrUsername: "your email or username", password: "a password",
    };
    return `Enter ${labels[name] ?? "a value"}; spaces alone are not enough.`;
  }
  if (mode === "register" && name === "username" && value.trim().length < 3) {
    return "Use at least 3 characters, excluding spaces at the start or end.";
  }
  if (mode === "register" && name === "password" && value.length < 8) {
    return "Use at least 8 characters for your password.";
  }
  if (name === "password" && new TextEncoder().encode(value).length > 72) {
    return "This password is too long. Shorten it; emoji and some letters use more space.";
  }
  return "";
}
