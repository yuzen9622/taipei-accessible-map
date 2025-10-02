"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right" | "bottom";
  size?: string; // e.g. "w-80"（水平的寬）或 "h-1/2"（底部的高）
  children?: React.ReactNode;
  title?: string;
};

export default function Drawer({
  open,
  onClose,
  side = "right",
  size = "w-80",
  children,
  title,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  // 決定 transform 類別
  const transformClass = (() => {
    if (side === "right") {
      return open ? "translate-x-0" : "translate-x-full";
    } else if (side === "left") {
      return open ? "translate-x-0" : "-translate-x-full";
    } else if (side === "bottom") {
      return open ? "translate-y-0" : "translate-y-full";
    }
    return "";
  })();

  // 決定定位樣式
  const positionClasses = (() => {
    if (side === "right") {
      return "top-0 bottom-0 right-0";
    } else if (side === "left") {
      return "top-0 bottom-0 left-0";
    } else if (side === "bottom") {
      return "left-0 right-0 bottom-0";
    }
    return "";
  })();

  // For bottom sheet, override width → full width, height = size
  const dimensionClasses =
    side === "bottom"
      ? `h-${size}` // e.g. size = "1/2" ➝ "h-1/2", 你要寫好 Tailwind 允許的
      : size; // for left/right, size = width like "w-80"

  return createPortal(
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-10 pointer-events-none`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Drawer"}
        ref={drawerRef}
        className={cn(
          "pointer-events-auto overflow-hidden h-full   w-full  max-w-[450px] fixed bg-background shadow-xl transform transition-transform duration-300",
          positionClasses,
          transformClass,
          dimensionClasses
        )}
      >
        <div className=" overflow-hidden h-full ">{children}</div>
      </section>
    </div>,
    document.body
  );
}
