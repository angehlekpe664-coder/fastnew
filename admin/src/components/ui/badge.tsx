import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "danger" | "secondary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-primary/15 text-primary",
        variant === "secondary" && "bg-secondary text-muted",
        variant === "success" && "bg-emerald-500/15 text-success",
        variant === "danger" && "bg-red-500/15 text-danger",
        className
      )}
      {...props}
    />
  );
}
