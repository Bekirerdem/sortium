import { useRef, type ReactNode } from "react";

/** Horizontal rail you can drag with a mouse (touch and trackpads scroll natively). */
export function Rail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  return (
    <div
      className="rail"
      ref={ref}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || !ref.current) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 6 && !d.moved) {
          d.moved = true;
          ref.current.classList.add("dragging");
        }
        if (d.moved) ref.current.scrollLeft = d.left - dx;
      }}
      onPointerUp={() => {
        drag.current = null;
        ref.current?.classList.remove("dragging");
      }}
      onPointerLeave={() => {
        drag.current = null;
        ref.current?.classList.remove("dragging");
      }}
    >
      {children}
    </div>
  );
}
