# INT-002 灯笼柱 · 参考图提示词 v1

词汇取自 docs/ART_DIRECTION.md（Master Prompt v1 的 cozy wooden structures、amber lanterns、tactile warm wood、soft moss、weathered natural stone、warm honey brown、soft amber gold），未引入新风格。尺寸目标：总高约 1.9 m（略高于角色 1.6 m），灯笼罩约 0.35 m；石基占地约 0.6 × 0.6 m。灯笼玻璃只在罩内呈微弱暖光，便于 Meshy 拆出 Emission，点亮与熄灭由代码控制。

## Prompt（正面，front.png）
```text
A single standing wooden lantern post for a premium stylized magical forest fantasy 3D game. A slightly crooked post of tactile warm wood in warm honey brown and natural bark brown, rising from a small base of weathered natural stones with patches of soft moss, a short curved wooden arm near the top from which hangs one small lantern with a dark bronze metal frame and four glass panes, the glass faintly glowing soft amber gold from inside, gently luminous but not neon. A few thin moss tufts and a small vine wrapped around the post. Elegant stylized proportions, soft but clearly defined organic silhouette, slightly organic crooked lines, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Entire lantern post visible from the stone base to the top of the post, front view at eye level, single isolated game asset, centered, neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no scene, no text, no watermark. Readable from a third-person gameplay camera distance.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, gothic architecture, grimdark horror, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, multiple lanterns, street lamp, cropped object, ground scenery, light rays, particles.
```
Negative 前半段取自 Master Negative Prompt；末尾几项是“单体、完整、无场景、光效由代码负责”的直接表述，`street lamp` 防止生成城市路灯。
