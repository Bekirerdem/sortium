import { useEffect, useState } from "react";

/** The page takes the colour of whatever artwork is in focus: images stack and crossfade, oldest are dropped. */
export function Backdrop({ art }: { art?: string }) {
  const [layers, setLayers] = useState<string[]>([]);
  useEffect(() => {
    if (!art) return;
    setLayers((l) => (l[l.length - 1] === art ? l : [...l.filter((x) => x !== art), art].slice(-3)));
  }, [art]);
  return (
    <>
      <div className="backdrop" aria-hidden>
        {layers.map((src, i) => (
          <img key={src} src={src} alt="" className={i === layers.length - 1 ? "on" : ""} />
        ))}
      </div>
      <div className="aurora" aria-hidden><i /><i /></div>
      <div className="veil" aria-hidden />
      <div className="grain" aria-hidden />
    </>
  );
}
