"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback ReactNode or a render function receiving error and reset callback */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Optional custom title for the default fallback card */
  fallbackTitle?: string;
  /** Optional custom description for the default fallback card */
  fallbackDescription?: string;
  /** Callback fired when the error boundary resets */
  onReset?: () => void;
  /** Callback fired when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Additional container classes */
  className?: string;
  /** Whether to show technical error details/stack */
  showDetails?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface DefaultFallbackViewProps {
  error: Error;
  resetErrorBoundary: () => void;
  title?: string;
  description?: string;
  className?: string;
  showDetails?: boolean;
}

export function DefaultErrorFallback({
  error,
  resetErrorBoundary,
  title = "此區塊載入失敗",
  description = "這個元件遇到問題無法正常顯示，請嘗試重新載入。",
  className,
  showDetails = false,
}: DefaultFallbackViewProps) {
  const isDev = process.env.NODE_ENV !== "production";
  const shouldShowDetails = showDetails || isDev;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn("w-full p-4 flex items-center justify-center", className)}
    >
      <Card className="w-full max-w-md border-destructive/20 bg-card shadow-sm text-center">
        <CardHeader className="pb-3">
          <div
            className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            aria-hidden="true"
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-base font-semibold text-foreground">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        {shouldShowDetails && error?.message && (
          <CardContent className="pt-0 pb-3 text-left">
            <details className="text-xs text-muted-foreground group">
              <summary className="cursor-pointer font-medium hover:text-foreground select-none flex items-center gap-1">
                <span>詳細錯誤資訊</span>
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted/80 p-2 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all border border-border">
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
              </pre>
            </details>
          </CardContent>
        )}

        <CardFooter className="pt-0 flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={resetErrorBoundary}
            className="min-h-[44px] min-w-[44px] gap-2 font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            aria-label="重新嘗試載入此區塊"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>重新嘗試</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    } else {
      console.error(
        "[ErrorBoundary] Caught unhandled component error:",
        error,
        errorInfo,
      );
    }
  }

  resetErrorBoundary = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const {
      children,
      fallback,
      fallbackTitle,
      fallbackDescription,
      className,
      showDetails,
    } = this.props;

    if (hasError && error) {
      if (typeof fallback === "function") {
        return fallback({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={error}
          resetErrorBoundary={this.resetErrorBoundary}
          title={fallbackTitle}
          description={fallbackDescription}
          className={className}
          showDetails={showDetails}
        />
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap any component with an ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  ComponentToWrap: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <ComponentToWrap {...props} />
    </ErrorBoundary>
  );

  const displayName =
    ComponentToWrap.displayName || ComponentToWrap.name || "Component";
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}

export default ErrorBoundary;
