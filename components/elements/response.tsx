"use client";

import type React from "react";
import type { ComponentProps } from "react";
import { Suspense, lazy } from "react";
import { cn } from "@/lib/utils";

type StreamdownProps = ComponentProps<typeof import("streamdown").Streamdown>;

const LazyStreamdown = lazy(async () => {
  const mod = await import("./streamdown-client");
  return { default: mod.Streamdown };
});

function PlainFallback({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div className={className} style={style}>
      <div style={{ whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

export function Response({
  className,
  children,
  style,
  ...props
}: StreamdownProps) {
  const mergedStyle: React.CSSProperties = {
    contentVisibility: "auto",
    containIntrinsicSize: "1px 800px",
    ...style,
  };

  const baseClass = cn(
    "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
    className,
  );

  return (
    <Suspense
      fallback={
        <PlainFallback className={baseClass} style={mergedStyle}>
          {children}
        </PlainFallback>
      }
    >
      <LazyStreamdown className={baseClass} style={mergedStyle} {...props}>
        {children}
      </LazyStreamdown>
    </Suspense>
  );
}
