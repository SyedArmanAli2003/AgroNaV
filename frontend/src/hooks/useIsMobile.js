import { useState, useEffect } from "react";

/**
 * Returns true when the viewport width is at or below `breakpoint` (default 480px).
 * Updates live on resize / orientation change so layout switches instantly when
 * a user toggles desktop ↔ mobile view.
 */
export default function useIsMobile(breakpoint = 480) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    // addEventListener is the modern API; addListener is the Safari fallback
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    setIsMobile(mql.matches);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return isMobile;
}
