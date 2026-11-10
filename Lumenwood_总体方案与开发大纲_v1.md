# 《流光之森》Lumenwood: Whispers of Light

> Chroma Awards Season 2 · Game | 方案整理 v1.0 | 2026-11-10
>
> 本文汇总此前对话中确定的设计和计划。标注“暂定/规划”的条目仍需要在开发验证后最终确认。
>
> **重要**：本作品为独立项目，实际执行以 AGENTS.md 对旧工程与资产的限制为准。Chroma 作品的正式 3D 美术资产由 Meshy 制作，现已领取 Meshy Pro。当前未审计本地项目代码，不能据此认定各模块已实现。

## 1. 一句话定位

第三人称 3D 奇幻森林探索游戏：玩家扮演松果拾光者，游走于一座会对光、声音和触碰产生回应的森林，通过自由探索、萤火航线、生态交互和隐藏道路发现世界的秘密。以惊艳的高品质风格化视觉、优美的空间声音与手感自然的环境互动作为核心竞争力。

## 2. 项目基本信息

| 项目 | 方案 |
|---|---|
| 中文名 | 流光之森 |
| 英文名 | Lumenwood（暂定） |
| 英文副标题 | Whispers of Light（暂定） |
| 参赛赛事 | Chroma Awards Season 2，Game Division |
| 参赛类别 | Experimental & Open Format（暂定，最终按成品确认） |
| 游戏平台 | Windows PC 浏览器，公开可玩，无需安装 |
| 游戏视角 | 第三人称自由探索 |
| 体验长度 | 15–25 分钟核心体验，完成后继续自由探索 |
| 技术 | React + TypeScript + Vite、Three.js / React Three Fiber、Drei、Zustand |
| 3D 美术资产 | Meshy Pro，角色、建筑、植物、动物、道具等 |
| 动画 | Mixamo 免费动作优先，Meshy / Blender 补足、重定向 |
| 声音 | Web Audio API / Three.js 空间音频，动态混音 |
| 存档 | 本地存档优先 |

## 3. 世界观与氛围

温暖、神秘、治愈且精致的森林世界。白天阳光穿过树冠，浅水、落叶和动物营造自然生命力；傍晚出现蓝色环境光、琥珀色灯笼、发光植物和萤火虫，玩家通过行动逐渐点亮森林。

**核心表达**：这不是只供观赏的森林。触摸、行走、靠近、引导光线与聆听声音都能引起真实、连续、有因果的环境反馈。

不走大型开放世界、写实摄影、廉价卡通、恐怖阴暗或过度炫光的方向。保留自由探索，避免不断强制任务箭头。

## 4. 三个主要区域

| 区域 | 视觉特点 | 体验角色 |
|---|---|---|
| A 林间营地 Woodland Camp | 温暖木屋、林间小径、营火、柔和金色光线 | 出生地、操作教学、首次环境互动、自由选择路线 |
| B 萤光湿地 Firefly Wetlands | 暮光蓝、浅水、荧光植物、萤火虫、低密度薄雾 | 萤火航线、光路连接、水面与植物响应、隐藏道路 |
| C 古树高地 Ancient Tree Highlands | 高地地形、巨大古树、纵深远景、可俯瞰林地 | 高级环境探索、收束世界变化、视听高潮 |

三地相互连接，可以自由探索。参赛版应控制区域密度与浏览器性能，宁可面积更紧凑也不做空旷世界。

## 5. 玩法系统与优先级

### 核心必做（MVP）

1. **自由探索**：WASD/Shift/鼠标第三人称控制，清晰道路和隐藏发现，空间引导弱化强制 UI。
2. **萤火航线**：利用灯笼、荧光花、风向等控制萤火虫的路线，点亮设施、解锁道路、形成路线挑战。必须在世界空间内交互，而不是弹窗小游戏。
3. **自然响应**：玩家接近花朵、走入水面、经过草地，触发形态变化、光波、音符或环境效果。视觉与声音由统一游戏状态驱动。
4. **隐藏探索**：通过生态、声音、光照提示发现新道路与小区域，强调好奇心奖励。
5. **视听高潮**：玩家对世界造成的变化在古树高地汇聚为逐层点亮、声音汇合的收尾。

### 后续可扩展（不得挤占 MVP 完成度）

溪流漂流、魔法种植、动物互动、更多植物与声音谜题、扩充地图和探索内容。

## 6. 玩家体验节奏（暂定）

- 0–2 分钟：林间营地，第一次操作与“森林回应”的惊喜。
- 2–7 分钟：自由探索与发现，逐步理解光、声音和植物线索。
- 7–15 分钟：萤火航线及环境机关，点亮区域并开启新路。
- 15–22 分钟：古树高地探索，应用此前学到的规则。
- 终章：古树和森林光芒、音乐汇聚，结局后可继续探索。

以上为体验节奏目标，不是必须按分钟锁死的剧情脚本。

## 7. 视觉与声音标准

### 美术风格：Master Art Style v1

**Style**: Premium Stylized Magical Forest Fantasy; cinematic high-end indie 3D game aesthetic; handcrafted soft-but-readable organic silhouettes; elegant stylized proportions; tactile sculpted surfaces; restrained PBR materials; immersive atmospheric depth.

**Palette**: muted moss green, deep forest green, warm honey timber, earthy bark brown, warm cream, amber glow, restrained twilight blue.

**Day**: warm sunlight filtering through layered canopy, soft shadow and deep environmental composition.

**Twilight**: cool blue environment fill, warm amber lanterns, subtly glowing flora, fireflies, controlled fog and bloom.

**Avoid**: cheap plastic cartoon, childish toy anatomy, photo-realistic surfaces, incoherent colors, oversaturated neon, enormous empty spaces, high-frequency micro-details, excessive post effects, mismatched assets.

**Important**: concept art's fog, firefly particles, glow and dramatic light are engine effects. Meshy should generate individual geometry/material assets with neutral lighting and isolated background, not bake full scene effects into mesh textures.

### 声音设计

- 自然声分区：近距离脚步/树叶/浅水，远距离虫鸣/鸟鸣/溪流。
- 空间声音跟随物体/位置变化，跨区域平滑过渡。
- 光路激活、花朵绽放、进入隐藏道路会增添音乐声部或音符。
- 古树演出使用玩家行动积累的动态音乐收束；优先保证声音舒适和动态范围。

## 8. 主角：A 方案「松果拾光者 / Acorn Lamplighter」

- 暖木纹面容、琥珀色大眼、弯曲松果兜帽、苔绿短叶披肩、奶油白袖子、棕色短裤、绿色护腿、皮靴。
- 约 4–4.5 头身，适配可控的人形比例。
- A-Pose，胳膊与身体分开，明确肘/腕/髋/膝/踝。
- 后背能辨识松果帽和短披肩，优先优化第三人称背面轮廓。
- 提灯单独建模并挂接骨骼，不与主角网格融合。
- Meshy 生成模型；Mixamo 免费行走/跑步/待机优先；Blender 整理动作，Three.js 控制状态机、动画混合和地面速度匹配。
- 四视图按 front / left / right / back 四张独立文件保存。AI 视角细节可能有差异，以正面与背面一致性为优先验收。

角色参考文件：原始正面及侧视图按项目规则不纳入 Git，校验信息见[角色参考目录说明](assets/reference/CHR-001-pinecone-gleaner/README.md)。

- [A 方案初稿](character-turnaround/00_original_A_concept.png)
- 正面 Front：`assets/reference/CHR-001-pinecone-gleaner/a-front.png`（本地参考图）
- 左侧 Left：`assets/reference/CHR-001-pinecone-gleaner/a-profile-facing-right.png`（本地参考图；配件位置待核对）
- 右侧 Right：`assets/reference/CHR-001-pinecone-gleaner/a-profile-facing-left.png`（本地参考图）
- [背面 Back](character-turnaround/04_back.png)

## 9. 资产生产原则

全部正式 3D 美术资产采用 Meshy：包括角色、植被、建筑、道具和生物。允许 Blender 优化模型，代码生成地形承载结构/碰撞代理/程序化光效及粒子等非美术模型。先确定风格，分资产独立生成，再用 Three.js 组装世界。

第一批风格验收四种代表资产：松果拾光者、典型针叶树、发光植物、林间木屋。每种保存输入参考、提示词、Meshy Task ID、积分、生成结果、修订记录、GLB 路径和授权信息。

模型与动画必须在灰盒运行时里验收；避免为数量优先、大量购买/消耗生成次数。

## 10. 技术架构

```text
public/assets/{characters,environment,props,animations}/
public/audio/{ambience,music,sfx}/
src/app/
src/game/{world/zones,player,camera,input,interaction,features/firefly,features/flora,audio,rendering,assets}/
src/{ui,state,shared}/
docs/{GAME_VISION,GAMEPLAY,ART_DIRECTION,ARCHITECTURE,ROADMAP,ASSET_MANIFEST,MESHY_PIPELINE,ANIMATION_PIPELINE,SUBMISSION}.md
AGENTS.md
PROGRESS.md
```

- Three.js/R3F 负责场景、相机、交互、骨骼动画混合、视觉效果。
- Zustand 管理持久游戏状态与配置；逐帧位置避免 React 高频 setState。
- Web GLB 管线优化、复用材质、实例化/LOD、贴图压缩与按需加载。
- Windows PC 浏览器目标优先，尽量稳定 60 FPS；具体性能以实际测试为准。

## 11. 开发里程碑（2026-11-09 拟定）

| 阶段 | 计划日期 | 目标 |
|---|---|---|
| P0 | 11/9–11/11 | 工程初始化、灰盒、移动/相机/暂停、验证脚本 |
| P1 | 11/12–11/20 | Meshy 主角、Mixamo 走跑、首批资产、统一资产管线 |
| P2 | 11/21–12/2 | 可游玩森林视觉样板、光照与环境声音 |
| P3 | 12/3–12/14 | 萤火航线、植物响应与探索解锁 |
| P4 | 12/15–12/26 | 三区域整合、动态音乐、情感与视觉高潮 |
| P5 | 12/27–2027/1/5 | 游戏测试、性能、部署、玩法录像与投稿 |

阶段日期为目标，不是实际完成证明。P0 是否完成需阅读本地 PROGRESS.md 才能确认。

## 12. 参赛交付

1. 公开可直接游玩的网页链接，首次访问无登录要求。
2. 展示真实玩法的演示视频下载链接。
3. 高质量封面与真实截图。
4. 游戏英文文字/字幕，符合赛道要求。
5. 清楚披露 Meshy 的关键 3D 资产使用，保存工作流与证据。
6. 版权许可记录与模型、动画、音频来源记录。

## 13. 当前优先级与待定事项

**已经明确**：独立于 Forest Moments；第三人称 Web；Meshy 资产；A 角色；优美视听＋自由探索＋环境互动；萤火航线是重要玩法而非全部游戏；三区域结构。

**仍待冻结**：最终英文名、主角身高、每区实际面积、地图精确布局、剧情与目标系统、萤火航线的全部规则、音乐素材、动画状态表、画质性能预算。

**下一步**：读取 Codex 新项目的 P0 真实进度，落实四个代表资产的设计与验收标准；先做角色 Rig/Idle/Walk/Run，再做树木、发光植物、木屋的视觉样板。

## 14. 概念图

- [世界设计与玩法总览概念板](concept-art/01_世界设计与玩法总览.png)
- [区域视觉与开发总览概念板](concept-art/02_区域视觉与开发总览.png)

> 两张图为项目概念展示。布局、角色外观、大小比例、时间与文字以正文和正式参考文件为准；概念图不能作为工程最终功能实现证明。
