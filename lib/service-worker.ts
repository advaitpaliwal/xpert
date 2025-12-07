export interface CacheStats {
  count: number;
  size: number;
  sizeFormatted: string;
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("Service Worker not supported");
    return Promise.resolve();
  }

  return navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      console.log("✅ Service Worker registered:", registration);

      // Check for updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              console.log("🔄 New Service Worker available. Refresh to update.");
            }
          });
        }
      });

      return registration;
    })
    .catch((error) => {
      console.error("❌ Service Worker registration failed:", error);
    });
}

export function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (registration) {
        return registration.unregister();
      }
      return false;
    })
    .catch((error) => {
      console.error("Failed to unregister service worker:", error);
      return false;
    });
}

export function clearServiceWorkerCache(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.success || false);
    };

    navigator.serviceWorker.controller?.postMessage(
      { type: "CLEAR_CACHE" },
      [messageChannel.port2]
    );
  });
}

export function getCacheStats(): Promise<CacheStats | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      resolve(event.data as CacheStats);
    };

    navigator.serviceWorker.controller?.postMessage(
      { type: "GET_CACHE_SIZE" },
      [messageChannel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export function getServiceWorkerStatus(): Promise<
  | "supported"
  | "not-supported"
  | "registered"
  | "not-registered"
  | "controller-active"
> {
  if (!isServiceWorkerSupported()) {
    return Promise.resolve("not-supported");
  }

  return navigator.serviceWorker.getRegistration().then((registration) => {
    if (!registration) {
      return "not-registered";
    }

    if (navigator.serviceWorker.controller) {
      return "controller-active";
    }

    return "registered";
  });
}
