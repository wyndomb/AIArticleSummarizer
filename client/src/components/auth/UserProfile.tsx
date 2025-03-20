import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut, forceLogout } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Add debug logging
  useEffect(() => {
    console.log("UserProfile mounted");
    return () => {
      console.log("UserProfile unmounted");
    };
  }, []);

  if (!user) return null;

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!user.user_metadata?.name) return "U";
    return user.user_metadata.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle logout directly in the UserProfile component
  const handleLogout = async () => {
    if (isLoading) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      console.log("Starting logout process");
      setIsOpen(false); // Close the dropdown

      // First, navigate to login page to avoid any protected route redirects
      setLocation("/login");

      // Then perform the actual logout
      const { error } = await signOut();

      if (error) {
        console.error("Logout error:", error);
        // If regular logout fails, try force logout
        await forceLogout();
        toast({
          title: "Logged out",
          description: "You have been forcefully logged out",
        });
      } else {
        toast({
          title: "Logged out",
          description: "You have been successfully logged out",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      // If any error occurs, try force logout
      await forceLogout();
      toast({
        title: "Logged out",
        description: "You have been forcefully logged out",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Log when the component renders
  console.log("UserProfile rendering");

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center space-x-2 rounded-full p-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          data-testid="user-profile-trigger"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.user_metadata?.avatar_url}
              alt={user.user_metadata?.name || "User"}
            />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {user.user_metadata?.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Use a div with onClick instead of a component that might render as an anchor */}
        <div
          onClick={handleLogout}
          className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          role="menuitem"
          tabIndex={0}
          data-testid="logout-menu-item"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>{isLoading ? "Signing out..." : "Sign out"}</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
