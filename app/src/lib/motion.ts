import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";

export const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shared easing vocabulary (DESIGN.md: 3 tokens). */
export const EASE = { land: "expo.out", pop: "back.out(1.6)", shift: "power3.inOut" } as const;

/** Buttons lean toward the cursor and spring back. */
export function useMagnetic<T extends HTMLElement>(strength = 0.3): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || matchMedia("(pointer: coarse)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "elastic.out(1, 0.4)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * strength);
      y((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => { x(0); y(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [strength]);
  return ref;
}

/** A cover that tilts in 3D toward the pointer. */
export function useTilt<T extends HTMLElement>(max = 10): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || matchMedia("(pointer: coarse)").matches) return;
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * max * 2);
      rx(-((e.clientY - r.top) / r.height - 0.5) * max * 2);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [max]);
  return ref;
}

/** Page entrance: headline words rise out of a mask, then marked elements land with a slight overshoot. */
export function useEntrance(scope: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root || reduced()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: EASE.land } });
      tl.from("[data-word]", { yPercent: 110, duration: 0.9, stagger: 0.035 })
        .from("[data-cover]", { scale: 0.86, filter: "blur(18px)", opacity: 0, duration: 1.1 }, 0.1)
        .from("[data-rise]", { y: 28, opacity: 0, duration: 0.8, stagger: 0.05, ease: EASE.pop }, 0.25);
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Count a number element from its current value to `to` instead of jumping. */
export function tweenNumber(el: HTMLElement | null, to: number, format: (n: number) => string) {
  if (!el) return;
  const from = Number(el.dataset.value ?? to);
  el.dataset.value = String(to);
  if (reduced() || from === to) { el.textContent = format(to); return; }
  const o = { v: from };
  gsap.to(o, { v: to, duration: 0.6, ease: "power2.out", onUpdate: () => { el.textContent = format(o.v); } });
}

/** Route changes morph shared elements (cover art) with the View Transitions API where available. */
export function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || reduced()) return update();
  doc.startViewTransition(() => flushSync(update));
}
