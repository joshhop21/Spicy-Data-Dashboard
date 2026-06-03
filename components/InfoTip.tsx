"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Plain-language explanation shown on hover / focus */
  text: string;
  /** Accessible label for the trigger */
  label?: string;
  className?: string;
};

/** Small (?) control — opens a definition popup that renders above page overflow clipping. */
export function InfoTip({ text, label = "What does this mean?", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tipId = useId();

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const tipWidth = Math.min(280, window.innerWidth - 24);
    const gap = 8;
    const margin = 12;

    const centerX = Math.max(
      margin + tipWidth / 2,
      Math.min(window.innerWidth - margin - tipWidth / 2, rect.left + rect.width / 2),
    );

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const preferBelow = spaceBelow >= 72 || spaceBelow >= spaceAbove;

    if (preferBelow) {
      setStyle({
        top: rect.bottom + gap,
        left: centerX,
        width: tipWidth,
        transform: "translateX(-50%)",
      });
    } else {
      setStyle({
        top: rect.top - gap,
        left: centerX,
        width: tipWidth,
        transform: "translate(-50%, -100%)",
      });
    }
  }, []);

  const show = () => {
    updatePosition();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updatePosition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, updatePosition]);

  const tooltip =
    mounted && open
      ? createPortal(
          <div
            id={tipId}
            role="tooltip"
            className="pointer-events-none fixed z-[9999] rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-stone-700 shadow-xl"
            style={style}
          >
            {text}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span className={`inline-flex align-middle ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-[10px] font-semibold leading-none text-stone-500 transition hover:border-stone-400 hover:bg-white hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-spice-gold/40"
          aria-label={label}
          aria-describedby={open ? tipId : undefined}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          ?
        </button>
      </span>
      {tooltip}
    </>
  );
}
