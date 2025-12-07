export const CACHE_CONFIG = {
  // React Query cache times - EVERYTHING cached indefinitely
  queries: {
    userProfile: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    expertise: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    topicImage: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    contentTopics: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    readingContent: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    podcastScript: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    quiz: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
    xUser: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
  },

  // IndexedDB configuration for large assets (audio files)
  indexedDB: {
    name: "xpert-cache",
    version: 1,
    stores: {
      audio: {
        name: "audio-cache",
        keyPath: "id",
        indexes: [
          { name: "url", keyPath: "url", unique: true },
          { name: "timestamp", keyPath: "timestamp", unique: false },
        ],
      },
      images: {
        name: "image-cache",
        keyPath: "id",
        indexes: [
          { name: "url", keyPath: "url", unique: true },
          { name: "timestamp", keyPath: "timestamp", unique: false },
        ],
      },
    },
    // Never expire cached items
    ttl: Infinity,
  },

  // Service Worker cache names
  serviceWorker: {
    version: "v1",
    caches: {
      static: "xpert-static-v1",
      images: "xpert-images-v1",
      api: "xpert-api-v1",
    },
    strategies: {
      images: "cache-first",
      api: "cache-first", // Cache first for everything
      static: "cache-first",
    },
  },

  // Prefetch configuration
  prefetch: {
    enableImagePrefetch: true,
    enableScriptPrefetch: true,
    prefetchCount: 4, // Prefetch all 4 topics
  },
} as const;

// Query key factories for consistent cache keys
export const queryKeys = {
  userProfile: (username: string) => ["userProfile", username] as const,
  expertise: (username: string) => ["expertise", username] as const,
  topicImage: (topicId: string) => ["topicImage", topicId] as const,
  contentTopics: (id: string, expertiseId: string) =>
    ["contentTopics", id, expertiseId] as const,
  readingContent: (id: string, expertiseId: string, readingId: string) =>
    ["readingContent", id, expertiseId, readingId] as const,
  podcastScript: (params: Record<string, string>) =>
    ["podcast-script", params] as const,
  quiz: (id: string, expertiseId: string, quizId: string) =>
    ["quiz", id, expertiseId, quizId] as const,
  xUser: (username: string) => ["xUser", username] as const,
} as const;
