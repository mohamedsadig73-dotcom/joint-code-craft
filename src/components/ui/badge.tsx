import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md",
        secondary: "border-transparent bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90 hover:shadow-md",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-md",
        outline: "text-foreground border-border/50 hover:bg-accent/10",
        success: "border-transparent bg-success text-white hover:bg-success/90 hover:shadow-md",
        warning: "border-transparent bg-warning text-white hover:bg-warning/90 hover:shadow-md",
        muted: "border-transparent bg-muted text-muted-foreground hover:bg-muted/80",
        /* WMS Pro soft variants — pill style with subtle bg + strong text */
        "wms-blue":   "border-transparent bg-[hsl(var(--wms-accent-soft2))] text-[hsl(var(--wms-accent))]",
        "wms-green":  "border-transparent bg-[hsl(var(--wms-green-soft))]  text-[hsl(var(--wms-green))]",
        "wms-red":    "border-transparent bg-[hsl(var(--wms-red-soft))]    text-[hsl(var(--wms-red))]",
        "wms-yellow": "border-transparent bg-[hsl(var(--wms-yellow-soft))] text-[hsl(var(--wms-yellow))]",
        "wms-purple": "border-transparent bg-[hsl(var(--wms-purple-soft))] text-[hsl(var(--wms-purple))]",
        "wms-teal":   "border-transparent bg-[hsl(var(--wms-teal-soft))]   text-[hsl(var(--wms-teal))]",
        "wms-gray":   "border-transparent bg-[hsl(var(--wms-bg4))]         text-[hsl(var(--wms-text3))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
