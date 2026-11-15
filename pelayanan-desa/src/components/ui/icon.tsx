import React from "react";
import { LucideIcon, LucideProps } from "lucide-react";

export interface IconProps extends LucideProps {
  /**
   * The lucide-react icon component to render.
   */
  icon: LucideIcon;
  /**
   * Defines the icon's semantic purpose for accessibility.
   * If the icon is decorative only, it will be hidden from screen readers.
   * If it has a function (e.g., inside an icon-only button), an aria-label must be provided.
   */
  "aria-label"?: string;
}

/**
 * Icon Wrapper Component
 * Enforces the icon convention defined in the Design System:
 * 1. Default size is 18px for inline with text.
 * 2. Default strokeWidth is 2.
 * 3. Handles accessibility (A11y) automatically based on aria-label.
 */
export function Icon({
  icon: LucideComponent,
  size = 18,
  strokeWidth = 2,
  className,
  ...props
}: IconProps) {
  const isDecorative = !props["aria-label"];

  return (
    <LucideComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={isDecorative ? "true" : undefined}
      aria-label={props["aria-label"]}
      {...props}
    />
  );
}
