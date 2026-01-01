import * as React from "react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, dir, ...props }, ref) => {
  // Try to get language context, fallback if not available
  let isRTL = false;
  try {
    const { language } = useLanguage();
    isRTL = language === 'ar';
  } catch {
    // Context not available, use document direction
    isRTL = document.documentElement.dir === 'rtl';
  }
  
  const textareaDir = dir || (isRTL ? 'rtl' : 'ltr');
  
  return (
    <textarea
      dir={textareaDir}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isRTL ? "text-right" : "text-left",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
