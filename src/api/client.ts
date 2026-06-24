import type { CreateUserResponse, LoginResponse, UserViewResponse } from "../types";

function parseBody<T>(data: unknown): T {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response from API");
  }
  const payload = data as { body?: string } & T;
  if (typeof payload.body === "string") {
    return JSON.parse(payload.body) as T;
  }
  return payload as T;
}

async function postJson<T>(url: string | undefined, body: unknown, label: string): Promise<T> {
  if (!url) {
    throw new Error(`${label} is not configured in .env`);
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => {
    throw new Error("API returned a non-JSON response");
  });
  const payload = parseBody<T & { error?: string; authenticated?: boolean }>(data);
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  if (payload.authenticated === false) {
    throw new Error(payload.error ?? "Request failed");
  }
  return payload;
}

export async function login(username: string, password: string) {
  return postJson<LoginResponse>(
    import.meta.env.VITE_LOGIN_API_URL,
    { username, password },
    "VITE_LOGIN_API_URL",
  );
}

export async function fetchUserView(username: string) {
  return postJson<UserViewResponse>(
    import.meta.env.VITE_VIEW_API_URL,
    { username },
    "VITE_VIEW_API_URL",
  );
}

export async function createStandardUser(email: string, folderNames: string[]) {
  return postJson<CreateUserResponse>(
    import.meta.env.VITE_CREATE_USER_API_URL,
    { email, folderNames },
    "VITE_CREATE_USER_API_URL",
  );
}

export async function completeOnboarding(payload: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}) {
  return postJson<{ success: boolean }>(
    import.meta.env.VITE_ONBOARDING_API_URL,
    payload,
    "VITE_ONBOARDING_API_URL",
  );
}

export async function ssoLogin(payload: {
  email: string;
  userKey: string;
  firstName: string;
  lastName: string;
  phone: string;
}) {
  return postJson<LoginResponse>(
    import.meta.env.VITE_SSO_LOGIN_API_URL,
    payload,
    "VITE_SSO_LOGIN_API_URL",
  );
}

export async function createSsoUser(email: string, folderNames: string[]) {
  return postJson<CreateUserResponse>(
    import.meta.env.VITE_CREATE_SSO_USER_API_URL,
    { email, folderNames },
    "VITE_CREATE_SSO_USER_API_URL",
  );
}
