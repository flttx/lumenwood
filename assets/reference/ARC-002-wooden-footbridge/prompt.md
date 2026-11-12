# ARC-002 林间石拱桥 · 参考图提示词 v3（四视图）

v2（`prompt-v2.md`，参考图 `front-v2.png`）只有一个 3/4 视角，Meshy 对看不到的一侧与桥头靠猜：从桥头看近侧栏杆扭曲、立柱堆在入口，用户评价“桥模型太差了”。v3 两处改变：结构改为实心的苔藓石拱桥加矮石栏墙（细栏杆在单图重建中最容易出错），并在一张图里画出同一座桥的四个视角，裁开后用 multi-image-to-3d 提交。词汇取自 docs/ART_DIRECTION.md 的 Master Prompt v1（weathered natural stone、soft moss、tactile warm wood）。游戏内长约 8 m、宽约 2.6 m、拱顶高约 1.3 m。

## Prompt（sheet.png，1536x1024；裁成 4 张）
```text
A product turnaround sheet of ONE small stone arch footbridge for a premium stylized magical forest fantasy 3D game, shown four times in a clean 2 by 2 grid with wide empty light gray gutters between the panels and nothing crossing the gutters: top left a three-quarter view from the front left and slightly above, top right a straight side elevation, bottom left a straight end view looking along the bridge into its walkway, bottom right a three-quarter view from the back right and slightly above. The same bridge in every panel, identical shape and colours. The bridge: a single gentle arch of large weathered natural stone blocks in warm gray with soft moss, a flat-topped walkway paved with worn warm wooden planks on top of the arch, a low solid stone parapet wall about knee to waist high along BOTH sides of the walkway for its full length, the walkway open and clear at both ends, small round stone pillars at the four corners each topped with a little unlit iron lantern, both ends of the bridge widening slightly into low ramps that meet the ground. Perfectly symmetrical left to right and front to back. Elegant stylized proportions, soft but clearly defined silhouette, carefully sculpted forms, subtle geometric simplification, restrained surface detail, high-quality stylized PBR materials with subtle roughness variation, rich but controlled saturation.
Neutral light gray background, soft even studio lighting without strong shadows, no ground plane, no water, no scene, no text, no labels, no watermark.
```

## Negative（附加）
```text
Photorealistic photography, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, exaggerated bloom, gothic architecture, grimdark horror, cluttered micro-details, muddy textures, noisy materials, blurry silhouettes, thin railings, rope, posts in the walkway, asymmetric bridge, broken wall, different bridges in different panels, overlapping panels, labels, arrows, river, water, ground scenery, light rays, particles.
```
