import { getSupabaseUrl, getSupabaseKey, getAccessToken } from "./config.js";

/**
 * Make authenticated request to Supabase Edge Function
 */
export async function apiRequest(functionName, body, method = "POST") {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Not logged in. Run: git-sweepher login");
  }

  const url = `${getSupabaseUrl()}/functions/v1/${functionName}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      apikey: getSupabaseKey(),
    },
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}

/**
 * Supabase Auth - sign in with email/password
 */
export async function signIn(email, password) {
  const url = `${getSupabaseUrl()}/auth/v1/token?grant_type=password`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: getSupabaseKey(),
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error_description || data.msg || "Login failed");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.user?.email,
  };
}
