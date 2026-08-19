"use client";

import { useEffect } from "react";

interface AosProviderProps {
  children: React.ReactNode;
}

export function AosProvider({ children }: AosProviderProps) {
  useEffect(() => {
    let isMounted = true;

    import("aos")
      .then((AOS) => {
        if (!isMounted) return;
        const aos = AOS.default || AOS;
        aos.init({
          duration: 700,
          easing: "ease-out-cubic",
          once: false,
          mirror: true,
          offset: 60,
          delay: 50,
        });
        aos.refresh();
      })
      .catch(() => {
        // Fallback gracefully if AOS fails
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return <>{children}</>;
}
