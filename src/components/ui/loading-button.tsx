import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, loading = false, loadingText, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "relative transition-all duration-200",
          loading && "cursor-wait",
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2 className="absolute h-4 w-4 animate-spin" />
        )}
        <span className={cn(loading && "opacity-0")}>
          {loading && loadingText ? loadingText : children}
        </span>
        {loading && loadingText && (
          <span className="absolute inset-0 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </span>
        )}
      </Button>
    );
  }
);
LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
