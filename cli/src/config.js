import Conf from "conf";

const config = new Conf({
  projectName: "git-sweepher",
  schema: {
    accessToken: { type: "string", default: "" },
    refreshToken: { type: "string", default: "" },
    email: { type: "string", default: "" },
    supabaseUrl: { type: "string", default: "" },
    supabaseKey: { type: "string", default: "" },
  },
});

// Default API endpoint — points to this project's Lovable Cloud backend
const DEFAULT_SUPABASE_URL = "https://gnhxotxraytofdvqjrjs.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduaHhvdHhyYXl0b2ZkdnFqcmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTYxNTUsImV4cCI6MjA4NjczMjE1NX0.Nz0orTN3UlZYt-CCxbew1RkVDantO-jLkHhrq6PmXs8";

export function getSupabaseUrl() {
  return config.get("supabaseUrl") || DEFAULT_SUPABASE_URL;
}

export function getSupabaseKey() {
  return config.get("supabaseKey") || DEFAULT_SUPABASE_KEY;
}

export function getAccessToken() {
  return config.get("accessToken");
}

export function saveTokens(accessToken, refreshToken, email) {
  config.set("accessToken", accessToken);
  config.set("refreshToken", refreshToken);
  config.set("email", email);
}

export function clearTokens() {
  config.delete("accessToken");
  config.delete("refreshToken");
  config.delete("email");
}

export function getEmail() {
  return config.get("email");
}

export { config };
