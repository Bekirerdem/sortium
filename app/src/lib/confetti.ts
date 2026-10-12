import gsap from "gsap";
import { reduced } from "./motion";

const COLORS = ["#ffd84d", "#ff6b8b", "#7cc7ff", "#9dffb0", "#fbf6f3", "#b04bff"];

/** A short burst of paper from a point on screen, used once when a pick lands onchain. */
export function burst(x: number, y: number, count = 46) {
  if (reduced()) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  document.body.appendChild(layer);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    const w = 6 + Math.random() * 6;
    p.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w * (0.4 + Math.random() * 0.8)}px;background:${COLORS[i % COLORS.length]}`;
    layer.appendChild(p);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 260 + Math.random() * 320;
    gsap.timeline()
      .to(p, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed, rotation: (Math.random() - 0.5) * 720, duration: 0.7, ease: "power3.out" })
      .to(p, { y: `+=${320 + Math.random() * 240}`, x: `+=${(Math.random() - 0.5) * 120}`, rotation: `+=${(Math.random() - 0.5) * 540}`, opacity: 0, duration: 1.3, ease: "power1.in" });
  }
  setTimeout(() => layer.remove(), 2300);
}
