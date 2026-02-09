"use client";

import {
  type CSSProperties,
  type ElementType,
  memo,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  spread = 2,
}: TextShimmerProps) => {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (
    <Component
      className={cn(
        "relative inline-block bg-clip-text text-transparent",
        className
      )}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
    >
      {children}
    </Component>
  );
};

export const Shimmer = memo(ShimmerComponent);
