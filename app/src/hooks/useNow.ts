import { useEffect, useState } from "react";

export function useNow(step = 1000) {
  const [now, setNow] = useState(Date.now() / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), step);
    return () => clearInterval(t);
  }, [step]);
  return now;
}
