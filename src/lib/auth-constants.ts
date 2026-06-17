export const SESSION_COOKIE_NAME = "aptelys_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const PENDING_AUTH_COOKIE_NAME = "aptelys_pending_auth";
export const PENDING_AUTH_MAX_AGE_SECONDS = 60 * 10;
export const PENDING_SIGNUP_COOKIE_NAME = "aptelys_pending_signup";
export const PENDING_SIGNUP_MAX_AGE_SECONDS = 60 * 10;
export const LOGIN_ATTEMPTS_COOKIE_NAME = "aptelys_login_attempts";
export const LOGIN_ATTEMPTS_MAX_AGE_SECONDS = 60 * 30;

export function getSharedCookieDomain(host?: string | null) {
  const normalizedHost = host?.split(",")[0]?.trim().split(":")[0]?.toLowerCase();

  if (!normalizedHost || normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
    return undefined;
  }

  if (normalizedHost === "aptelys.com" || normalizedHost.endsWith(".aptelys.com")) {
    return ".aptelys.com";
  }

  if (normalizedHost === "interellis.com" || normalizedHost.endsWith(".interellis.com")) {
    return ".interellis.com";
  }

  return undefined;
}
