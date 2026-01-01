import * as React from "react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, ...props }, ref) => {
    // Try to get language context, fallback if not available
    let isRTL = false;
    try {
      const { language } = useLanguage();
      isRTL = language === 'ar';
    } catch {
      // Context not available, use document direction
      isRTL = document.documentElement.dir === 'rtl';
    }
    
    // Determine text direction based on input type
    const shouldBeLTR = type === 'email' || type === 'url' || type === 'number' || type === 'tel';
    const inputDir = dir || (shouldBeLTR ? 'ltr' : (isRTL ? 'rtl' : 'ltr'));
    
    return (
      <input
        type={type}
        dir={inputDir}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)/0.15)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-ring/50",
          shouldBeLTR ? "text-left" : (isRTL ? "text-right" : "text-left"),
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
