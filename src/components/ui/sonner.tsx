import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          error: "group-[.toaster]:bg-destructive/10 group-[.toaster]:backdrop-blur-md group-[.toaster]:border-destructive/30 group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_4px_24px_hsl(var(--destructive)/0.2)]",
          success: "group-[.toaster]:bg-success/10 group-[.toaster]:backdrop-blur-md group-[.toaster]:border-success/30 group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_4px_24px_hsl(var(--success)/0.2)]",
          warning: "group-[.toaster]:bg-warning/10 group-[.toaster]:backdrop-blur-md group-[.toaster]:border-warning/30 group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_4px_24px_hsl(var(--warning)/0.2)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
