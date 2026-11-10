export type MeshyEndpoint = 'image-to-3d' | 'multi-image-to-3d' | 'rigging' | 'animations'
/** Credit estimate from https://docs.meshy.ai/en/api/pricing (checked 2026-11-09). Unknown models are refused. */
export function estimateCredits(params: Record<string, unknown>, endpoint: MeshyEndpoint = 'image-to-3d') {
  if (endpoint === 'rigging') return 5
  // Animation is charged per action in the request.
  if (endpoint === 'animations') return 3 * (Array.isArray(params.action_ids) ? params.action_ids.length : 1)
  const model = String(params.ai_model ?? 'latest'), textured = params.should_texture !== false
  const resolution = String(params.texture_resolution ?? '2k'), geometry = String(params.geometry_resolution ?? 'standard')
  if (params.texture_model !== undefined) throw new Error('Non-default texture_model has extra Retexture cost; estimate it manually.')
  let credits: number
  // Multi-Image to 3D is priced the same as Image to 3D for these models.
  if (['latest', 'meshy-7.1', 'meshy-6'].includes(model)) credits = !textured ? 20 : resolution === '8k' ? 35 : 30
  else if (endpoint === 'image-to-3d' && ['meshy-6-lite', 'meshy-t2', 'meshy-t2.5'].includes(model)) credits = !textured ? 5 : resolution === '8k' ? 20 : 15
  else throw new Error(`No price known for ai_model "${model}" on ${endpoint}`)
  return geometry === '2k' || geometry === '4k' ? credits + 5 : credits
}
