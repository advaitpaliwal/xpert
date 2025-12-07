import { CACHE_CONFIG } from "./cache-config";

export interface CachedAudio {
  id: string;
  url: string;
  blob: Blob;
  timestamp: number;
  metadata?: {
    duration?: number;
    size: number;
    contentType: string;
  };
}

export interface CachedImage {
  id: string;
  url: string;
  blob: Blob;
  timestamp: number;
}

class IndexedDBCache {
  private dbName = CACHE_CONFIG.indexedDB.name;
  private version = CACHE_CONFIG.indexedDB.version;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create audio cache store
        if (!db.objectStoreNames.contains("audio-cache")) {
          const audioStore = db.createObjectStore("audio-cache", {
            keyPath: "id",
          });
          audioStore.createIndex("url", "url", { unique: true });
          audioStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Create image cache store
        if (!db.objectStoreNames.contains("image-cache")) {
          const imageStore = db.createObjectStore("image-cache", {
            keyPath: "id",
          });
          imageStore.createIndex("url", "url", { unique: true });
          imageStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  // Audio caching methods
  async cacheAudio(
    id: string,
    url: string,
    blob: Blob,
    metadata?: CachedAudio["metadata"]
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const cachedAudio: CachedAudio = {
      id,
      url,
      blob,
      timestamp: Date.now(),
      metadata,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["audio-cache"], "readwrite");
      const store = transaction.objectStore("audio-cache");
      const request = store.put(cachedAudio);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAudio(id: string): Promise<CachedAudio | null> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["audio-cache"], "readonly");
      const store = transaction.objectStore("audio-cache");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAudioByUrl(url: string): Promise<CachedAudio | null> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["audio-cache"], "readonly");
      const store = transaction.objectStore("audio-cache");
      const index = store.index("url");
      const request = index.get(url);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAudio(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["audio-cache"], "readwrite");
      const store = transaction.objectStore("audio-cache");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAudio(): Promise<CachedAudio[]> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["audio-cache"], "readonly");
      const store = transaction.objectStore("audio-cache");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Image caching methods
  async cacheImage(id: string, url: string, blob: Blob): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const cachedImage: CachedImage = {
      id,
      url,
      blob,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["image-cache"], "readwrite");
      const store = transaction.objectStore("image-cache");
      const request = store.put(cachedImage);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getImage(id: string): Promise<CachedImage | null> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["image-cache"], "readonly");
      const store = transaction.objectStore("image-cache");
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getImageByUrl(url: string): Promise<CachedImage | null> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["image-cache"], "readonly");
      const store = transaction.objectStore("image-cache");
      const index = store.index("url");
      const request = index.get(url);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteImage(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["image-cache"], "readwrite");
      const store = transaction.objectStore("image-cache");
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ["audio-cache", "image-cache"],
        "readwrite"
      );

      const audioStore = transaction.objectStore("audio-cache");
      const imageStore = transaction.objectStore("image-cache");

      audioStore.clear();
      imageStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get cache size for analytics
  async getCacheSize(): Promise<{
    audio: { count: number; totalSize: number };
    images: { count: number; totalSize: number };
  }> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const audioItems = await this.getAllAudio();
    const audioSize = audioItems.reduce((sum, item) => sum + item.blob.size, 0);

    const transaction = this.db!.transaction(["image-cache"], "readonly");
    const store = transaction.objectStore("image-cache");
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const imageItems = request.result as CachedImage[];
        const imageSize = imageItems.reduce(
          (sum, item) => sum + item.blob.size,
          0
        );

        resolve({
          audio: { count: audioItems.length, totalSize: audioSize },
          images: { count: imageItems.length, totalSize: imageSize },
        });
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const indexedDBCache = new IndexedDBCache();

// Helper function to generate cache key from podcast params
export function generateAudioCacheKey(params: {
  username: string;
  expertiseId: string;
  audioId: string;
  topicTitle: string;
}): string {
  return `audio_${params.username}_${params.expertiseId}_${params.audioId}`;
}

// Helper function to download and cache audio
export async function cacheAudioFromUrl(
  id: string,
  url: string
): Promise<string> {
  // Check if already cached
  const cached = await indexedDBCache.getAudio(id);
  if (cached) {
    return URL.createObjectURL(cached.blob);
  }

  // Download audio
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch audio");

  const blob = await response.blob();
  const metadata = {
    size: blob.size,
    contentType: blob.type,
  };

  // Cache it
  await indexedDBCache.cacheAudio(id, url, blob, metadata);

  // Return blob URL
  return URL.createObjectURL(blob);
}

// Helper function to download and cache images
export async function cacheImageFromUrl(
  id: string,
  url: string
): Promise<string> {
  // Check if already cached
  const cached = await indexedDBCache.getImage(id);
  if (cached) {
    return URL.createObjectURL(cached.blob);
  }

  // Download image
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();

  // Cache it
  await indexedDBCache.cacheImage(id, url, blob);

  // Return blob URL
  return URL.createObjectURL(blob);
}
