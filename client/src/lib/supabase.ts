import { createClient } from "@supabase/supabase-js";

// Create a single supabase client for interacting with your database
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced environment variable logging
console.log("[Supabase] Environment variables check:");
console.log("- VITE_SUPABASE_URL:", supabaseUrl ? "✓ Found" : "❌ Missing");
console.log(
  "- VITE_SUPABASE_ANON_KEY:",
  supabaseAnonKey ? "✓ Found" : "❌ Missing"
);

// Validate environment variables
if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL environment variable");
}

if (!supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_ANON_KEY environment variable");
}

// Export the storage key for debugging
export const supabaseStorageKey = `sb-${
  supabaseUrl && typeof supabaseUrl === "string"
    ? supabaseUrl.split("//")[1]?.split(".")[0]
    : "unknown"
}-auth-token`;

// Ensure we have valid values for createClient
const url =
  supabaseUrl && typeof supabaseUrl === "string"
    ? supabaseUrl
    : "https://placeholder-url.supabase.co"; // Placeholder URL to prevent crashes

const key =
  supabaseAnonKey && typeof supabaseAnonKey === "string"
    ? supabaseAnonKey
    : "placeholder-key"; // Placeholder key to prevent crashes

console.log(`[Supabase] Initializing with URL: ${url.substring(0, 8)}...`);

// Create a simple Supabase client with minimal options
export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Simple helper to sign in with Google
export const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};

// Get current session directly from Supabase
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Error getting session:", error);
      return null;
    }
    return data.session;
  } catch (error) {
    console.error("Error in getSession:", error);
    return null;
  }
};

// Get current user directly from Supabase
export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error getting user:", error);
      return null;
    }
    return data.user;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
};

// Simple sign out that doesn't trigger loops
export const signOut = async () => {
  try {
    return await supabase.auth.signOut();
  } catch (error) {
    console.error("Error in signOut:", error);
    // Fallback manual cleanup
    localStorage.removeItem(supabaseStorageKey);
    return { error };
  }
};

// Force logout as a last resort
export const forceLogout = async () => {
  console.log("Force logout initiated");
  try {
    // Try normal signout first
    await supabase.auth.signOut({ scope: "global" });
  } catch (error) {
    console.error("Error in force logout:", error);
  }

  // Clear storage regardless of signout success
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error("Error clearing storage:", e);
  }

  return { error: null };
};
