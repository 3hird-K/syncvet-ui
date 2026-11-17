"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  /** Number of lines shown while collapsed. Defaults to 2. */
  collapsedLines?: number;
  className?: string;
  buttonClassName?: string;
  moreLabel?: string;
  lessLabel?: string;
  defaultExpanded?: boolean;
}

/**
 * Long announcement/post body with a Facebook-style "See more" / "See less"
 * toggle. The toggle only appears when the text actually overflows the
 * collapsed line count, so short notices stay clean.
 */
export function ExpandableText({
  text,
  collapsedLines = 2,
  className,
  buttonClassName,
  moreLabel = "See more",
  lessLabel = "See less",
  defaultExpanded = false,
}: ExpandableTextProps) {
  const visibleRef = useRef<HTMLParagraphElement | null>(null);
  const fullHeightRef = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const visible = visibleRef.current;
    if (!visible) return;

    const measure = () => {
      // Only measure while collapsed; when expanded the full text is visible.
      if (expanded) return;
      const full = fullHeightRef.current;
      if (!full) return;
      setOverflows(full.offsetHeight > visible.clientHeight + 1);
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(visible);
    if (fullHeightRef.current) observer.observe(fullHeightRef.current);
    return () => observer.disconnect();
  }, [text, expanded, collapsedLines]);

  // Re-check after web fonts finish loading, since text metrics may change.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fontSet = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fontSet?.ready) return;
    fontSet.ready
      .then(() => {
        const visible = visibleRef.current;
        const full = fullHeightRef.current;
        if (!visible || !full || expanded) return;
        setOverflows(full.offsetHeight > visible.clientHeight + 1);
      })
      .catch(() => {});
  }, [text, expanded]);

  if (!text) return null;

  return (
    <div className="relative min-w-0">
      {/* Invisible, unclamped copy used only to detect real overflow. */}
      {!expanded && (
        <p
          ref={fullHeightRef}
          aria-hidden="true"
          className={cn(
            "invisible pointer-events-none absolute inset-x-0 top-0",
            className
          )}
        >
          {text}
        </p>
      )}

      <p
        ref={visibleRef}
        className={cn("whitespace-pre-line break-words", !expanded && "overflow-hidden", className)}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: collapsedLines,
              }
        }
      >
        {text}
      </p>

      {(overflows || expanded) && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          aria-expanded={expanded}
          className={cn(
            "inline-flex items-center gap-0.5 mt-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer",
            buttonClassName
          )}
        >
          {expanded ? lessLabel : moreLabel}
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      )}
    </div>
  );
}
