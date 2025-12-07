"use client";

import { useState, useEffect } from "react";

export function StarsBackground() {
  const [mounted, setMounted] = useState(false);
  const [stars] = useState(() =>
    Array.from({ length: 200 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 1,
      top: Math.random() * 100,
      left: Math.random() * 100,
      duration: Math.random() * 2 + 1,
      delay: Math.random() * 2,
    }))
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-foreground"
          style={{
            width: `${star.size}px`,
            height: `${star.size}px`,
            top: `${star.top}%`,
            left: `${star.left}%`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
