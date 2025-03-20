import React from "react";
import { ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  // Simple check if this is a public route
  const isPublicPath =
    location.startsWith("/login") ||
    location.startsWith("/debug") ||
    location.startsWith("/forced-logout") ||
    location.startsWith("/auth/callback") ||
    location.startsWith("/emergency-logout");

  // CRITICAL: Show simple loading indicator if auth is still initializing
  if (isLoading) {
    console.log("ProtectedRoute: Auth is still loading...");
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Always allow public paths regardless of auth state
  if (isPublicPath) {
    console.log("ProtectedRoute: Rendering public path content");
    return <>{children}</>;
  }

  // After loading, if not authenticated and not on public path, redirect to login
  if (!isAuthenticated) {
    console.log("ProtectedRoute: User not authenticated, redirecting to login");
    // Use a direct href redirect to avoid React state issues
    window.location.href = "/login";
    return null;
  }

  // User is authenticated and not on public path, render children
  console.log("ProtectedRoute: User is authenticated, rendering content");
  return <>{children}</>;
}
