import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, id, name, ...props }, ref) => {
    const fallbackId = React.useId();
    const fieldId = id ?? `field-${fallbackId}`;
    return (
      <input
        id={fieldId}
        name={name ?? fieldId}
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
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
