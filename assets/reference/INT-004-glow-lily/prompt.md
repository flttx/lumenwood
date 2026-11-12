# INT-004 发光百合 · 参考图提示词 v1

2026-11-12 对照设计图（`concept-art/01`“自然互动”、`02`“发光植物”与湿地画面）：设计中的发光植物是大朵、半透明、粉紫色的百合状花，花心发出暖光；现有 INT-001 是小白铃铛花，第三人称镜头下几乎认不出。INT-004 取代 INT-001 作为可唤醒的花。词汇取自 docs/ART_DIRECTION.md 的 Master Prompt v1。游戏内高约 1.1 m（角色腰到胸）。发光由代码驱动，参考图只要求花瓣浅色、花心暖色，便于拆出 Emissive 或由着色器提亮。

## Prompt（front.png，1024x1024）
```text
A single large luminous magical lily plant for a premium stylized magical forest fantasy 3D game. Three big open star-shaped lily flowers on tall gently curving stems, each flower wide and clearly readable, with six broad pointed petals in pale lilac fading to soft rose pink at the tips, slightly translucent, and a warm glowing amber gold heart with a few thick stamens. Several long broad strap leaves in deep moss green curving outward from a small mossy mound at the base, one closed flower bud. Elegant stylized proportions, soft but clearly defined organic silhouette, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Whole plant visible including the moss base, three-quarter view at slightly elevated eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark. The flowers must read as big solid shapes from a third-person gameplay camera distance.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, tiny flowers, thin wiry petals, pot, vase, multiple separate plants, cropped plant, ground scenery, light rays, particles.
```
