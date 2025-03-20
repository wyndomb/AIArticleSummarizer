import { useState, useEffect } from "react";
import { signOut, forceLogout } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Add debug logging
  useEffect(() => {
    console.log("LogoutButton mounted");

    // Log the DOM structure to help debug the nested anchor issue
    const logDOMStructure = () => {
      // Check for nested anchor tags
      const nestedAnchors = document.querySelectorAll("a a");
      if (nestedAnchors.length > 0) {
        console.error("Found nested anchor tags:", nestedAnchors);

        // Log the parent elements to help debug
        nestedAnchors.forEach((anchor, index) => {
          let parent = anchor.parentElement;
          const path = [];

          while (parent) {
            path.unshift(
              parent.tagName +
                (parent.id ? `#${parent.id}` : "") +
                (parent.className
                  ? `.${parent.className.replace(/\s+/g, ".")}`
                  : "")
            );
            parent = parent.parentElement;
          }

          console.error(`Nested anchor ${index + 1} path:`, path.join(" > "));
        });
      } else {
        console.log("No nested anchor tags found");
      }

      // Check for nested buttons
      const nestedButtons = document.querySelectorAll("button button");
      if (nestedButtons.length > 0) {
        console.error("Found nested button tags:", nestedButtons);
      } else {
        console.log("No nested button tags found");
      }

      // Check for buttons inside anchors
      const buttonsInAnchors = document.querySelectorAll("a button");
      if (buttonsInAnchors.length > 0) {
        console.error("Found buttons inside anchor tags:", buttonsInAnchors);
      } else {
        console.log("No buttons inside anchor tags found");
      }

      // Check for anchors inside buttons
      const anchorsInButtons = document.querySelectorAll("button a");
      if (anchorsInButtons.length > 0) {
        console.error("Found anchors inside button tags:", anchorsInButtons);
      } else {
        console.log("No anchors inside button tags found");
      }

      // Log the dropdown menu content
      const userProfileElement = document.querySelector(
        "[data-radix-dropdown-menu-content-wrapper]"
      );
      if (userProfileElement) {
        console.log("UserProfile DOM structure:", userProfileElement.innerHTML);

        // Check what element type the DropdownMenuItem is
        const menuItems =
          userProfileElement.querySelectorAll('[role="menuitem"]');
        menuItems.forEach((item, index) => {
          console.log(`MenuItem ${index + 1} tag:`, item.tagName);
          console.log(`MenuItem ${index + 1} children:`, item.innerHTML);
        });
      }
    };

    // Wait for the DOM to be fully rendered
    setTimeout(logDOMStructure, 500);

    return () => {
      console.log("LogoutButton unmounted");
    };
  }, []);

  const handleLogout = async () => {
    if (isLoading) return; // Prevent multiple clicks

    try {
      setIsLoading(true);
      console.log("Starting logout process");

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

  if (!user) return null;

  // Log when the component renders
  console.log("LogoutButton rendering");

  return (
    <div
      onClick={handleLogout}
      className="flex items-center w-full cursor-pointer"
      data-testid="logout-button"
    >
      <LogOut className="mr-2 h-4 w-4" />
      <span>{isLoading ? "Signing out..." : "Sign out"}</span>
    </div>
  );
}
