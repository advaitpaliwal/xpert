"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Register service worker on mount
    if (process.env.NODE_ENV === "production") {
      registerServiceWorker();
    } else {
      console.log("🔧 Service Worker disabled in development");
    }
  }, []);

  return null;
}
