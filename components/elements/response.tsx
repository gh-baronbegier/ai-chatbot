"use client";

import type React from "react";
import type { ComponentProps } from "react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
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

function useNearViewport(rootMargin = "800px 0px") {
  const ref = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isNear };
}

export function Response({
  className,
  children,
  style,
  ...props
}: StreamdownProps) {
  const mergedStyle: React.CSSProperties = {
    ...style,
  };

  const baseClass = cn(
    "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
    className,
  );

  const { ref, isNear } = useNearViewport();

  return (
    <div ref={ref}>
      {isNear ? (
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
      ) : (
        <PlainFallback className={baseClass} style={mergedStyle}>
          {children}
        </PlainFallback>
      )}
    </div>
  );
}
