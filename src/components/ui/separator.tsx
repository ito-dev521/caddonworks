import * as React from "react"

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`border-t border-gray-200 ${className}`}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator }