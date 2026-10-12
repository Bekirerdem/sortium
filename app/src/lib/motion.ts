import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";

export const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Shared easing vocabulary (DESIGN.md: 3 tokens). */
export const EASE = { land: "expo.out", pop: "back.out(1.6)", shift: "power3.inOut" } as const;

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
      tl.from("[data-word]", { yPercent: 110, duration: 1.05, stagger: 0.06 })
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

/** Sections below the fold rise in as they scroll into view, children staggered, once each. */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: unknown[]) {
  useEffect(() => {
    const root = scope.current;
    if (!root || reduced() || typeof IntersectionObserver === "undefined") return;
    const targets = [...root.querySelectorAll<HTMLElement>("[data-reveal]")].filter((el) => !el.dataset.shown);
    targets.forEach((el) => gsap.set(el.querySelectorAll(":scope > *"), { y: 36, opacity: 0 }));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.dataset.shown = "1";
        io.unobserve(el);
        gsap.to(el.querySelectorAll(":scope > *"), { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: EASE.land });
      }
    }, { rootMargin: "0px 0px -12% 0px" });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
