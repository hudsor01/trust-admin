import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  /** Enable auto-sizing based on content */
  autoSize?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoSize, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm ring-offset-background transition-shadow",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "contrast-more:border-foreground/50 contrast-more:placeholder:text-muted-foreground/80",
          "md:text-sm",
          autoSize && "field-sizing-content max-h-[300px]",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
