import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

type SafeMarkdownProps = {
  content: string | null | undefined;
  className?: string;
};

/**
 * A safe wrapper for ReactMarkdown that handles edge cases and prevents rendering issues
 */
const SafeMarkdown: React.FC<SafeMarkdownProps> = ({
  content,
  className = "",
}) => {
  // Add state for tracking render errors
  const [hasRenderError, setHasRenderError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Debug the content when it changes
  useEffect(() => {
    console.log("SafeMarkdown content received:", {
      type: typeof content,
      length: content ? content.length : 0,
      preview: content ? content.substring(0, 50) : null,
      contentIsNull: content === null,
      contentIsUndefined: content === undefined,
      contentIsEmptyString: content === "",
    });

    // Reset error state when content changes
    setHasRenderError(false);
    setErrorDetails(null);
  }, [content]);

  // Error boundary pattern
  useEffect(() => {
    // Add window error handler to catch React rendering errors
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("DOM") || event.message.includes("node")) {
        console.error("DOM-related error in SafeMarkdown:", event);
        setHasRenderError(true);
        setErrorDetails(event.message);
        // Prevent the error from propagating
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  // Don't render anything if content is null/undefined/empty
  if (!content) {
    return <div className="text-slate-500 italic">No content to display</div>;
  }

  // If we had a render error, display fallback
  if (hasRenderError) {
    return (
      <div className="p-4 border border-red-200 rounded bg-red-50 text-red-700">
        <p className="mb-2 font-semibold">Error rendering markdown content</p>
        {errorDetails && <p className="text-sm">{errorDetails}</p>}
        <details className="mt-2">
          <summary className="cursor-pointer text-sm">View raw content</summary>
          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
            {content}
          </pre>
        </details>
      </div>
    );
  }

  // Ensure content is a string (sometimes API responses can be objects)
  const markdownContent =
    typeof content === "object" ? JSON.stringify(content) : String(content);

  // Basic content validation
  const hasValidContent = markdownContent.trim().length > 0;

  // Define components with proper type safety
  const components: Components = {
    // Handle code blocks properly
    code: ({ className, children, ...props }) => {
      const isInline = !props.node?.position?.start.line;
      return (
        <code
          className={`${className || ""} ${
            isInline ? "inline-code" : "block-code"
          }`}
          {...props}
        >
          {children}
        </code>
      );
    },
    // Make sure links open in new tab
    a: ({ href, children, ...props }) => {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  // Wrap the ReactMarkdown component in an error boundary
  try {
    return (
      <div className={`markdown-content ${className}`}>
        {hasValidContent ? (
          <ReactMarkdown
            // Add key to force re-render when content changes completely
            key={`md-${markdownContent.length}`}
            components={components}
          >
            {markdownContent}
          </ReactMarkdown>
        ) : (
          <div className="text-slate-500 italic">Empty content</div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return (
      <div className="p-4 border border-amber-200 rounded bg-amber-50 text-amber-700">
        <p>Failed to render markdown content.</p>
        <pre className="mt-2 p-2 bg-white rounded text-xs">
          {typeof content === "string"
            ? content.substring(0, 100) + "..."
            : String(content)}
        </pre>
      </div>
    );
  }
};

export default SafeMarkdown;
