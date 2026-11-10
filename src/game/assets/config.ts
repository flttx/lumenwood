// Root for optimized, locally hosted GLB assets (public/assets/); maxConcurrentLoads is not enforced yet.
export const assetConfig = { baseUrl: `${import.meta.env.BASE_URL}assets/`, maxConcurrentLoads: 4 } as const
