import React from "react";
import { useToast } from "./use-toast";
import { useEffect, useState } from "react";

export function Toaster() {
  const { toasts } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col p-4 space-y-4 max-w-md w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out ${
            toast.variant === "destructive"
              ? "border-l-4 border-red-500"
              : "border-l-4 border-blue-500"
          }`}
          style={{
            animation: "slideIn 0.3s ease-out forwards",
          }}
        >
          {toast.title && <div className="font-medium mb-1">{toast.title}</div>}
          {toast.description && <div>{toast.description}</div>}
          {toast.action && <div className="mt-2">{toast.action}</div>}
        </div>
      ))}
      <style>
        {`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        `}
      </style>
    </div>
  );
}
