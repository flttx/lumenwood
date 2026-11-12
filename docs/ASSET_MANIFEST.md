# 资产登记与预算

## 已实现
- 本清单的分类、字段与状态定义，以及第一批四种资产的规划条目。
- 第一批四种资产全部生成并集成（2026-11-10）。VEG-001 针叶树经用户确认为 `可用`；CHR-001 松果拾光者、INT-001 发光植物、ARC-001 森林木屋为 `已集成`，待用户在游戏内确认视觉后改为 `可用`。地面仍是灰盒几何体，不登记为正式美术资产。
- P3 新增 INT-002 灯笼柱（2026-11-11 用户授权约 30–40 积分），一次生成成功并集成为萤火航线的灯笼，状态 `已集成`，待用户游戏内确认。
- P4 新增 VEG-002 古树、PRP-001 高地岩石、INT-003 苔石灯座（2026-11-12 用户授权总上限 120 积分），各一次生成成功并集成，状态 `已集成`，待用户游戏内确认。
- 场景升级新增 10 件（2026-11-12 用户授权约 10 件、≤ 360 积分）：两种高大树木、倒木、蕨类、发光蘑菇、芦苇、苔石、脚踏石、木桥、栅栏，全部一次生成成功并集成，状态 `已集成`，待用户游戏内确认。
- 参考图均入库于 `assets/reference/<ID>/`（PNG 不纳入版本管理，README 记录来源与 SHA-256）。

流程见 `docs/MESHY_PIPELINE.md`，风格依据见 `docs/ART_DIRECTION.md`。禁止使用 Aholo Forest Moments 的任何资产，禁止在此记录密钥。

## 分类与 ID 规则

| 类别 | ID 前缀 | 范围 | GLB 目录 |
| --- | --- | --- | --- |
| Character | `CHR-` | 玩家角色及可绑骨的人形角色 | `public/assets/models/character/` |
| Vegetation | `VEG-` | 树木、灌木、草、苔藓等静态植被 | `public/assets/models/vegetation/` |
| Architecture | `ARC-` | 木屋、桥、营地构筑等 | `public/assets/models/architecture/` |
| Props | `PRP-` | 灯笼、木箱、岩石等静态道具 | `public/assets/models/props/` |
| Interactive | `INT-` | 会对玩家产生反应的物体（发光、开合、摆动） | `public/assets/models/interactive/` |
| Creatures | `CRT-` | 动物与林间生物 | `public/assets/models/creatures/` |

ID 格式为“前缀 + 三位序号”，一经分配不再复用，退役资产保留原条目。

## 字段定义

| 字段 | 说明 |
| --- | --- |
| 优先级 | 高 / 中 / 低，表示在当前阶段的验证价值。 |
| 状态 | `规划` → `参考就绪` → `已生成` → `验收通过` / `退回` → `已优化` → `已集成` → `可用`；`退役`。 |
| 参考图 | `assets/reference/<ID>/` 中的文件及其来源。 |
| Meshy Task ID | 每次生成的任务 ID，多次尝试全部列出并标出采用的那次。 |
| 生成积分 | 每次实际消耗的积分及累计值，以 Meshy 账单为准。 |
| 模型面数 | 三角面数：原始 → LOD0 → LOD1。 |
| 贴图规格 | 尺寸 × 种类（BaseColor / Normal / ORM / Emissive）及格式。 |
| GLB 路径 | 优化后的游戏资源路径。 |
| 其他 | 用途/区域、尺寸目标、动画、来源与权利、许可证明位置、生成日期与模型版本、原始文件与 .blend 位置、验收备注。 |

预算均为**暂定**：首个资产集成后，用 `pnpm test:e2e` 的性能基线实测修正。当前灰盒基线是 60 FPS（vsync 封顶）、32 次绘制调用、962 个三角形。

## 第一批：代表性资产

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数（暂定 LOD0 上限） | 贴图规格（暂定） | GLB 路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CHR-001 | 松果拾光者 | Character | 高 | 已集成 | `a-front.png` + `a-back.png`（背视图 codex-cli 生成） | 生成 `01a1c5ac-a8ac-7590-879d-e5e557b9c476`；绑骨 `01a1c5b1-b1d1-7168-bf2e-825f26227a07`；待机动画 `01a1c5b2-8644-77a9-9c7d-ee068d22d165` | 38（30 + 5 + 3） | 20,767 → 19,600（≤ 20,000） | 1024² BaseColor / Normal / MetallicRoughness（JPEG，内嵌） | `public/assets/models/character/CHR-001.glb` |
| VEG-001 | 针叶树 | Vegetation | 高 | 可用 | `front.png`（codex-cli 生成） | `01a1c2fb-9c7c-76b4-bfad-a01f9df70604`（第 1 次，采用） | 30 | 3,987 → LOD0 3,987 → LOD1 1,176 | 1024² BaseColor / Normal / MetallicRoughness（JPEG，内嵌） | `public/assets/models/vegetation/VEG-001.glb` |
| INT-001 | 发光植物 | Interactive | 中 | 已替换（2026-11-12 起由 INT-004 取代，游戏不再加载；GLB 暂留） | `front.png`（codex-cli 生成） | `01a1c5a5-99bc-767a-aa7f-d46fc8e57baa` | 30 | 2,002 → 1,959（≤ 2,000） | 1024² BaseColor / Normal / MetallicRoughness / Emissive（JPEG，内嵌） | `public/assets/models/interactive/INT-001.glb` |
| ARC-001 | 森林木屋 | Architecture | 中 | 已集成 | `front.png` + `three-quarter.png`（codex-cli 生成） | `01a1c5a9-7bfc-725b-8493-8f24167765a3` | 30 | 14,533（≤ 15,000，未减面） | 2048² BaseColor / Normal / MetallicRoughness（JPEG，内嵌） | `public/assets/models/architecture/ARC-001.glb` |

累计积分：128（VEG-001 30、INT-001 30、ARC-001 30、CHR-001 38）；2026-11-10 生成后余额 1092。P3 起累计见下方 INT-002。

授权：VEG-001 为 2026-11-10 用户逐项授权（最多 2 次、60 积分，用了 1 次）。同日用户表示第一批其余资产“都不需要授权”，参考图（codex-cli）与 Meshy 生成、绑骨、动画据此执行；脚本仍要求上限参数，本轮自设 INT-001、ARC-001 各最多 3 次 / 90 积分，CHR-001 生成最多 3 次、绑骨与动画各最多 2 次、合计 150 积分，均只用了 1 次。

### CHR-001 松果拾光者
- **用途**：玩家角色，替换灰盒胶囊体。
- **参考**：A 方案，用户已确认；是唯一造型依据，详见 `docs/ART_DIRECTION.md` 第 3 节。来源与权利说明待用户补充。
- **参考处理（2026-11-10）**：以 `a-front.png` 为输入用 codex-cli 补出背视图 `a-back.png`；配件左右以正视图为准，两张侧视图与之矛盾，不作为生成输入。
- **尺寸**：游戏内身高定为 1.6 m（绑骨时由 `height_meters` 设定）。A 字姿势下双臂展开宽 0.93 m、前后 0.53 m；碰撞半径 0.35 m 与镜头注视高度 1.25 m 未改。
- **验收重点**：面部与眼睛的可读性；兜帽、叶片披肩、前后摆的穿插与蒙皮变形；手指。
- **生成（2026-11-10）**：multi-image-to-3d，meshy-7.1，`pose_mode: a-pose`，输入正、背两张，参数见 `assets/meshy/params/CHR-001.json`，30 积分。原始 20,767 三角形、单材质，无 Emissive。
- **绑骨与动画**：Meshy Rigging（5 积分）产出 24 根骨骼的人形骨架，附带 walking（1.07 s）与 running（0.67 s）；Animation 库动作 0「Idle」（3 积分，4.03 s）。三段动作都是原地动作（髋部水平位移为 0）。来源是 Meshy 付费套餐，未用 Mixamo。
- **优化**：`scripts/blender/assemble_character.py` 把三段动作合进同一骨架（clip 名 idle / walk / run），删去绑骨自带的单帧绑定动作；在骨骼修改器之前减面到 19,600；贴图缩到 1024²（角色在 6.5 m 镜头下约占画面高度三分之一，1024 已够用）。产物 `public/assets/models/character/CHR-001.glb`，2.38 MB，SHA-256 `2d2ae554…d7d935`；`.blend` 在绑骨任务目录（不纳入版本管理）。
- **集成**：`player/Character.tsx` 替换胶囊体，按水平速度切换动作（< 0.3 m/s 待机，> 5.2 m/s 奔跑，±0.3 m/s 滞回，交叉淡化 0.25 s），走/跑播放速率随速度缩放。
- **初检（Claude，非用户验收）**：Meshy 缩略图与游戏截图中脸、兜帽、披肩、皮袋与铜环位置和参考一致，行走姿态正常、朝向正确；未近距离检查手指、穿插与蒙皮变形，未检查脚滑。

### VEG-001 针叶树
- **用途**：森林主体树种，替换灰盒圆锥树，需实例化（灰盒中有 48 棵）。
- **风格依据**：Master Prompt 中的树皮、深林绿与苔藓绿枝叶、有机剪影。
- **尺寸**：与灰盒一致，树高约 4.8 m、树干底半径约 0.4 m（再乘 0.8–1.28 的实例缩放），以免改变已验证的碰撞与遮挡参数；如有偏差，同步更新 `forestLayout.ts`。
- **验收重点**：林冠剪影在镜头距离下的层次；实例化后的绘制调用与三角形数；LOD1 的切换。
- **参考图**：`assets/reference/VEG-001-conifer/front.png`，2026-11-10 经授权用 codex-cli 按 `prompt.md` v1 生成 1 张；只有正面，权利说明待用户确认。
- **生成记录（第 1 次，2026-11-10）**：image-to-3d，meshy-7.1，参数见 `assets/meshy/params/VEG-001.json`，实际消耗 30 积分（与估算一致）。原始文件在 `assets/meshy/raw/VEG-001/01a1c2fb-9c7c-76b4-bfad-a01f9df70604/`（不纳入版本管理）：`model.glb` 11.6 MB（SHA-256 `2827704d…74921a`）、`model.pre_remeshed.glb` 107 MB（约 445.7 万三角形）、BaseColor/Normal/Roughness/Metallic 贴图与 5 张缩略图。Meshy 最多保留 3 天，本地副本是唯一留存。
- **实测（解析 GLB，未在 Blender 或游戏内打开）**：单网格、单材质（双面），3,987 三角形、8,305 顶点；内嵌 3 张贴图（BaseColor、Normal、MetallicRoughness），无 Emissive。包围盒 7.88 × 15.0 × 7.53 m，原点在底部——`auto_size` 估成 15 m，优化时需缩放到约 4.8 m（系数 0.32），缩放后树冠最宽约 2.5 m。
- **初步观察（仅看 Meshy 缩略图，非正式验收）**：分层枝叶、裸露树干与带苔藓的根部和参考图一致，四个视角剪影完整，未见漂浮碎片；4,000 面下枝叶为较大的片状簇，比参考图粗。接缝、法线、根部展开宽度是否影响碰撞代理（树干底半径 0.4 m）未检查。
- **验收**：2026-11-10 用户决定采用第 1 次生成结果（依据为缩略图与以上数据，未逐项做第 4 步的接缝、法线检查）。
- **优化（2026-11-10）**：`scripts/blender/optimize_tree.py` 在 Blender 5.2.1 后台运行，可复现。缩放 0.32 到高 4.8 m；原点移到裸露树干段（离地 12%–20% 高度）的中心、底部贴地；三张贴图缩到 1024² 并以 JPEG（质量 85）内嵌；Decimate 生成 LOD1（1,176 三角形）。LOD0 未减面（3,987 已在预算内）。两级共用一个材质，导出为单个 GLB，含 `VEG-001_LOD0`、`VEG-001_LOD1` 两个网格。产物 `public/assets/models/vegetation/VEG-001.glb`，1.03 MB，SHA-256 `4f2c6d1b…f39326`；`.blend` 存于原始目录 `assets/meshy/raw/VEG-001/01a1c2fb-9c7c-76b4-bfad-a01f9df70604/VEG-001.blend`（不纳入版本管理）。未用 Draco/meshopt/KTX2，加载端也未启用解码器。
- **实测尺寸（缩放后，按距树干轴的最大半径）**：地面 0–0.2 m 根部展开 0.82 m，0.4–1.0 m 裸干 0.24–0.37 m，树冠最宽 1.33 m（1.8–2.0 m 高）。碰撞代理与遮挡代理保持不变（树干底半径 0.4 m、高 4.8 m，再乘实例缩放），与裸干相符；根部的视觉展开比碰撞圆宽，角色可踩进根须外缘，属预期。
- **集成**：`world/zones/Forest.tsx` 用 drei `useGLTF` 加载，两个 `InstancedMesh`（LOD0 近、LOD1 远）承载 48 棵树，每 0.2 s 按相机水平距离重新分组（切换距离 16 m，滞回 ±2 m，纯函数 `treeLod.ts` 有单元测试）；每棵树绕竖轴按序号旋转，避免完全相同的朝向。模型加载前树木不显示（Suspense 空回退），灰盒树已移除。
- **性能（e2e 基线，同上一轮条件）**：平均 16.67 ms、p95 16.8 ms、最大 17.3 ms；绘制调用 32 → 6，三角形 962 → 约 10.5 万（随视角变化，目视检查时一帧为 15.0 万）。仍受 60 Hz vsync 封顶。
- **游戏内目视检查（2026-11-10，Claude 内置浏览器）**：比例与角色、视距协调，根部苔藓与分层枝叶可读，无漂浮或缺面；未在不同光照、近距离贴树或低画质下检查。

### INT-001 发光植物
- **用途**：对应 Master Prompt 中的 luminous flowers / glowing mushrooms，作为玩家靠近或停留时产生反应的交互植物原型。归入 Interactive，因为其核心是反应，而不只是植被装饰。
- **尺寸**：高 0.7 m（角色膝到腰之间），占地 0.44 × 0.32 m。
- **特殊需求**：发光部位必须能拆出 Emissive 贴图或独立材质；发光强度、呼吸和反应动画由代码驱动，粒子由代码生成。
- **验收重点**：暮光照明下的发光可读性；避免 exaggerated bloom 和 excessive neon。
- **生成（2026-11-10）**：image-to-3d，选用 meshy-6，因为按 Meshy 文档只有 meshy-6 + PBR + 2k 才输出 Emission 贴图；参数见 `assets/meshy/params/INT-001.json`，30 积分。原始 2,002 三角形，Emission 贴图只覆盖花冠，无需在 Blender 补绘。
- **优化**：`scripts/blender/optimize_static.py` 缩放到 0.7 m、原点在底部中心、减到 1,959 三角形、四张贴图缩到 1024² JPEG。产物 0.85 MB，SHA-256 `5daa8587…2753d4`。
- **集成**：`features/flora/GlowFlowers.tsx` 在出生点和木屋附近放 6 株（位置见 `world/zones/campLayout.ts`），共享几何、各自复制材质。玩家距离 4 m 内发光强度从 0.5 平滑升到 2.4（1.2 m 内达到峰值），离开后回落，纯函数 `glow.ts` 有单元测试。植物不参与碰撞，可以穿过。
- **初检（Claude，非用户验收）**：模型完整，花、叶、苔藓与石头可辨；当前白天光照下截图看不出发光强弱变化，反应只由单元测试验证，未目视确认，也未在暮光下检查。

### ARC-001 森林木屋
- **用途**：林间营地的地标建筑，验证大型静态资产的面数、贴图与碰撞代理。
- **风格依据**：Master Prompt 中的 cozy wooden structures、温暖木质、覆苔、与森林有可信联系；不得出现哥特式建筑元素（Negative Prompt）。
- **尺寸**：5.23 × 5.0 × 4.86 m（宽 × 高 × 深，含烟囱），按参考图门高约占总高 42% 推算门高约 2.1 m。
- **验收重点**：地标剪影；木纹与苔藓材质不嘈杂；面数在预算内。
- **生成（2026-11-10）**：multi-image-to-3d，meshy-7.1，输入正面与左前 3/4 两张，参数见 `assets/meshy/params/ARC-001.json`，30 积分。原始 14,533 三角形，已在预算内。
- **优化**：`scripts/blender/optimize_static.py` 缩放到 5.0 m、原点在底部中心，贴图保留 2048²（地标，玩家会走近）并转 JPEG。产物 6.29 MB，是目前最大的资产（BaseColor 占 3.4 MB），SHA-256 `2db2d0b7…65c6e9`。
- **集成**：`world/zones/Cabin.tsx` 放在 (14, −14)，门朝出生点（旋转 −45°），周围 7.8 m 内没有树。碰撞代理为旋转盒体 4.6 × 4.2 m（`player/collision.ts` 的 `pushOutOfBox`，略小于墙体，玩家可站到屋檐下）；镜头遮挡代理为半径 2.1 m、高 5 m 的圆柱，是近似值。
- **初检（Claude，非用户验收）**：截图中门、窗、灯笼、烟囱与参考一致，门朝出生点；未逐项检查背面、屋内和接缝。

## P3：萤火航线资产

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数 | 贴图规格 | GLB 路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INT-002 | 灯笼柱 | Interactive | 高 | 已集成 | `front.png`（codex-cli 生成） | `01a1cb36-6dd4-777f-9fc8-44be45d8a29a` | 30 | 4,132（≤ 4,200，未减面） | 1024² BaseColor / Normal / MetallicRoughness / Emissive（JPEG，内嵌） | `public/assets/models/interactive/INT-002.glb` |

累计积分：158（第一批 128 + INT-002 30）。生成前余额 1092，生成后未再查询（按消耗推算 1062）。

授权：2026-11-11 用户在 P3 范围选择中授权“Meshy 生成灯笼柱，约 30–40 积分（含参考图）”。脚本上限设为 1 次 / 40 积分，实际 1 次、30 积分；参考图用 codex-cli 生成 1 张。

### INT-002 灯笼柱
- **用途**：萤火航线的节点。玩家把萤火带到灯笼旁点亮它，同一区域的灯笼全部点亮后，萤火流沿灯笼链打开去往下一区域的路。归入 Interactive。
- **尺寸**：高 1.9 m（略高于角色），占地约 0.62 × 0.57 m；灯笼挂在横臂下，位于模型局部 −X 方向 0.19 m、离地约 1.3 m。
- **参考图**：`assets/reference/INT-002-lantern-post/front.png`，提示词见同目录 `prompt.md`（词汇取自 Master Prompt，灯笼玻璃内只有微弱暖光，便于拆出 Emission）。权利说明待用户确认。
- **生成（2026-11-11）**：image-to-3d，选 meshy-6 以取得 Emission 贴图，参数 `assets/meshy/params/INT-002.json`，30 积分。原始 4,132 三角形、单材质；Emission 贴图只覆盖灯笼玻璃。
- **初检（Claude，非用户验收）**：Meshy 四视图缩略图中弯曲木柱、绳箍与铜箍、横臂、铜框玻璃灯笼、缠藤和覆苔石基与参考一致，无明显破面或漂浮碎片；未在 Blender 中逐项检查法线与接缝。
- **优化**：`scripts/blender/optimize_static.py`（Blender 5.2）高 1.9 m、原点在底部中心，三角形未减（已在预算内），四张贴图缩到 1024² JPEG。产物 0.95 MB，SHA-256 `e1c98172…ab0c1c4`；`.blend` 存于原始目录（不纳入版本管理）。
- **集成**：`features/route/Lanterns.tsx` 在营地北侧林径旁放 3 座（`features/route/routeLayout.ts`），横臂转向林径。未点亮时玻璃不发光；点亮后发光强度在 2 s 内升起，并有加色光晕与地面光池（不使用实时点光源）。2026-11-12 起改为实时点光源照亮周围（`rendering/LocalLights.tsx`），去掉地面光池。柱子有 0.18 m 圆形碰撞，不参与镜头遮挡。

## P4：古树高地资产

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数 | 贴图规格 | GLB 路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VEG-002 | 古树 | Vegetation | 高 | 已集成 | `front.png`（codex-cli 生成） | `01a1cd54-2a22-7219-a966-78cf9dd4410a` | 30 | 20,445（≤ 20,500，未减面） | 1024² BaseColor / Normal / MetallicRoughness / Emissive（JPEG，内嵌；Emissive 实际近乎全黑，见下） | `public/assets/models/vegetation/VEG-002.glb` |
| PRP-001 | 高地岩石 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cd5b-34d8-718f-ab2c-b088fbf98ab8` | 30 | 2,831 | 1024² BaseColor / Normal / MetallicRoughness（JPEG，内嵌） | `public/assets/models/props/PRP-001.glb` |
| INT-003 | 苔石灯座 | Interactive | 高 | 已集成 | `front.png`（codex-cli 生成） | `01a1cd60-e54f-7787-803c-75a3e8813430` | 30 | 3,130 | 1024² BaseColor / Normal / MetallicRoughness / Emissive（JPEG，内嵌） | `public/assets/models/interactive/INT-003.glb` |

累计积分：248（此前 158 + P4 90）。生成前余额 1062，生成后按脚本输出推算 972。

授权：2026-11-12 用户在 P4 范围选择中授权“古树 + 2 件配景，≤ 120 积分”。脚本上限：VEG-002 2 次 / 60，PRP-001、INT-003 各 1 次 / 30（合计不超过 120）；三件都是 1 次成功、各 30 积分；参考图各用 codex-cli 生成 1 张。

### VEG-002 古树
- **用途**：古树高地的地标与结局舞台。三座灯座依次点亮根、树干、树冠三个高度段，全部点亮后树冠盛放。
- **尺寸**：高 24 m（角色的 15 倍），树冠宽约 24 m，根丘地面半径约 10 m，在 3–5 m 高处收窄到约 6 m（按优化后网格分高度段测量）。
- **生成（2026-11-12）**：image-to-3d，meshy-6（为取得 Emission），target_polycount 20,000，参数 `assets/meshy/params/VEG-002.json`。
- **初检（Claude，非用户验收）**：剪影、扭转树干、带岩石的根丘与分层树冠和参考一致。树冠比参考更亮、更偏黄绿，游戏内用材质颜色乘一层淡灰绿压回苔绿。Meshy 输出的 Emission 贴图几乎全黑：参考图中的琥珀光纹被画进了 BaseColor，而且只有几个像素宽。因此游戏内光纹由着色器生成（见集成）。近看可见较大的平面块面，属模型本身的面数与 1024² 贴图限制。
- **优化**：`optimize_static.py`，高 24 m、原点在底部中心，面数未减；首次按 2048² 导出为 9.34 MB，改为 1024² 后为 2.17 MB，SHA-256 `636a9b77…4592df65`。
- **集成**：`world/zones/Highland.tsx` 放在平台中央 (−4, 116)，高度 +7 m。着色器补丁按高度分三段：从 BaseColor 中按颜色抠出琥珀光纹，并在树皮纹理（红明显大于绿的纹素）上叠加沿树干流动的程序化光线；树冠段另加暖色辉光，结局时整体增强，并在树冠处加一个大型加色光晕。碰撞为半径 7.5 m 的根丘圆，遮挡代理为底部 +7 m、半径 4.5 m、高 24 m 的圆柱。

### PRP-001 高地岩石
- **用途**：坡道两肩与平台上的配景，实例化（一次绘制），平台上的岩石带圆形碰撞（半径 0.95 × 缩放）。
- **生成与优化**：image-to-3d，meshy-7.1，30 积分；优化为高 1.4 m（1.68 × 1.4 × 1.96 m）、2,831 三角形、0.74 MB。初检：三块覆苔圆石与蕨类，和参考一致；Meshy 的岩石颜色比参考略偏粉灰。
- **布置**：坡道两肩 6 组（坡道外、无碰撞）与平台随机散布 12 组（避开古树、林径、花、灯座和树；见 `forestLayout.ts`）。

### INT-003 苔石灯座
- **用途**：古树高地的萤火节点（高地版灯笼），规则与灯笼柱相同。
- **生成与优化**：image-to-3d，meshy-6（带 Emission），30 积分；优化为高 1.3 m（0.77 × 1.3 × 0.77 m）、3,130 三角形、0.67 MB。Emission 覆盖顶部凹槽。立石倾斜，凹槽中心在模型空间 (0.03, 1.2, −0.18)，光点随朝向旋转。
- **集成**：与灯笼柱共用 `features/route/Lanterns.tsx`（按种类配置模型、发光强度与光晕颜色），3 座围绕古树、距树约 12.5 m，正面朝向古树；碰撞半径 0.42 m。

## 场景升级资产（2026-11-12）

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数 | 贴图规格 | GLB 与尺寸 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VEG-003 | 红杉巨木 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdee-2723-75c2-aa3b-7614355ad181` | 30 | LOD0 7,355 / LOD1 1,568 | 1024² | `public/assets/models/vegetation/VEG-003.glb`（1.49 MB，`0411ddba…8ce02691`），尺寸 28 m（树干半径约 2.2 m，板根约 5 m） |
| VEG-004 | 高冷杉 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdf1-9691-7640-b297-df8d76915b8f` | 30 | LOD0 6,030 / LOD1 1,372 | 1024² | `public/assets/models/vegetation/VEG-004.glb`（1.34 MB，`c06ed718…a77a5918`），尺寸 18 m（树干半径约 0.75 m） |
| VEG-005 | 倒木 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdf4-4c6a-76f8-8891-4c998be27aa5` | 30 | 4,058 | 1024² | `public/assets/models/vegetation/VEG-005.glb`（1.03 MB，`35df5825…f251e4aa`），尺寸 5.4 × 2.6 × 2.5 m |
| VEG-006 | 蕨类丛 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdf6-1f7a-7156-a4c8-743624571506` | 30 | LOD0 2,197 / LOD1 509 | 512² | `public/assets/models/vegetation/VEG-006.glb`（0.41 MB，`e15d8fce…e4108169`），尺寸 0.9 m |
| VEG-007 | 发光蘑菇丛 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdf8-4522-7004-a8df-5a2403fd5aae` | 30 | LOD0 2,600 / LOD1 607 | 512²（含 Emissive） | `public/assets/models/vegetation/VEG-007.glb`（0.46 MB，`a4921897…2b9f31f4`），尺寸 0.55 m |
| VEG-008 | 芦苇香蒲 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdfd-1e67-718b-b6bf-d9020164cc0f` | 30 | 1,776 | 512² | `public/assets/models/vegetation/VEG-008.glb`（0.34 MB，`e58e98a5…b081f810`），尺寸 1.7 m |
| PRP-002 | 苔石小组 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cdff-e533-7033-9148-42eedd1e1545` | 30 | 1,516 | 512² | `public/assets/models/props/PRP-002.glb`（0.26 MB，`de75b483…a0b44bc8`），尺寸 1.3 × 0.9 × 1.2 m |
| PRP-003 | 脚踏石 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1ce02-28fd-7606-85b3-f9bc1ae3fc4b` | 30 | 1,480 | 512² | `public/assets/models/props/PRP-003.glb`（0.29 MB，`2d5d73b6…fab9684b`），尺寸 2.26 × 0.18 × 0.81 m |
| ARC-002 | 木桥 | Architecture | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1ce03-6a25-7128-ac4d-b12416f26910` | 30 | 6,156 | 1024² | `public/assets/models/architecture/ARC-002.glb`（1.05 MB，`6e7ddf52…7145745f`），尺寸 6.96 × 2.43 × 1.44 m |
| ARC-003 | 栅栏段 | Architecture | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1ce05-177b-7288-b481-ada57aac9f36` | 30 | 2,582 | 512² | `public/assets/models/architecture/ARC-003.glb`（0.37 MB，`091235e6…e2b4c6e9`），尺寸 2.61 × 1.28 × 0.45 m |

累计积分：548（此前 248 + 本批 300）。生成前余额 972，生成后按脚本输出推算 672。

授权：2026-11-12 用户反馈场景偏离设计图后，选择“约 10 件，≤ 360 积分（每件 1 次，失败可重试 1 次）”。脚本上限每件 1 次 / 30 积分，十件都一次成功；参考图各用 codex-cli 生成 1 张，提示词与检查见 `assets/reference/<ID>/`。

- **初检（Claude，非用户验收）**：Meshy 缩略图与参考图一致，无明显破面或漂浮碎片；未在 Blender 中逐项检查法线和接缝。VEG-007 的 Emission 覆盖菌褶（与 VEG-002 不同，本次可用）。
- **优化**：两种大树、蕨类和蘑菇用 `optimize_tree.py`（生成 LOD1）；其余用 `optimize_static.py`。`optimize_tree.py` 修了一处问题：高树的某些高度段没有顶点时，半径统计会对空序列取最大值而报错，现改为默认 0。
- **集成**：树木由 `forestLayout.ts` 按树种生成（营地 300 棵：红杉约 22%、冷杉约 38%、VEG-001 幼树其余；湿地 40 棵；高地 60 棵；2026-11-12 布局第二版起这些数量为上限，按密林与空地分布，当前实际共 391 棵；远景改用冷杉与红杉），碰撞半径与遮挡高度按树种取实测值。蕨类、苔石、蘑菇、倒木、芦苇、脚踏石、栅栏、木桥由 `sceneryLayout.ts` 生成，经 `rendering/Scatter.tsx` 分块实例化。倒木与栅栏有旋转盒碰撞；较大的苔石有圆形碰撞；木桥架在湿地林径的两条小溪上，角色走在桥面上。

## 场景丰富资产（2026-11-12）

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数 | 贴图规格 | GLB 与尺寸 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VEG-009 | 白桦 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1ceff-b16c-7371-b6e4-bfbc2b618a11` | 30 | LOD0 3,266 / LOD1 1,176 | 1024² | `public/assets/models/vegetation/VEG-009.glb`（1.14 MB，`36717b7b…67f3ed9d`），尺寸 高 11 m（树干半径约 0.3 m，树冠半径约 2.9 m） |
| VEG-010 | 开花灌木 | Vegetation | 中 | 已集成（第 2 版） | `front.png` v2（codex-cli 生成；v1 为 `front-v1.png`） | `01a1cf87-617b-7490-8f30-ca1446de8c48`（v1 `01a1cf02-880f-76d0-8ac0-9fc4e567740f` 废弃） | 60（2 次各 30） | LOD0 5,268 / LOD1 1,176 | 1024² | `public/assets/models/vegetation/VEG-010.glb`（1.53 MB，`50d43b69…9be54472`），尺寸 高 1.4 m、半径约 0.79 m |
| VEG-011 | 野花丛 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf07-f292-723d-a622-968aa8a67512` | 30 | LOD0 1,316 / LOD1 392 | 512² | `public/assets/models/vegetation/VEG-011.glb`（0.34 MB，`3002ac79…ade2f5fe`），尺寸 高 0.5 m |
| VEG-012 | 苔藓树桩 | Vegetation | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf0a-92fb-72f7-ba3b-f0dc3720b8f6` | 30 | 2,450 | 512² | `public/assets/models/vegetation/VEG-012.glb`（0.36 MB，`f3a8a581…b099f489`），尺寸 2.12 × 0.9 × 1.99 m（含外展根系） |
| PRP-004 | 篝火 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf0c-838f-769e-b617-e61f8879204a` | 30 | 2,994 | 1024² | `public/assets/models/props/PRP-004.glb`（0.87 MB，`22599edf…daec6b55`），尺寸 1.56 × 0.55 × 1.58 m |
| PRP-005 | 木箱木桶组 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf0e-fd99-70b8-90fd-784fcecf58b2` | 30 | 2,948 | 1024² | `public/assets/models/props/PRP-005.glb`（0.83 MB，`38c5fd8c…e12f50bf`），尺寸 1.64 × 1.25 × 1.08 m |
| PRP-006 | 林径路标 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf10-e3c9-77b5-ba80-e2afa84f926c` | 30 | 1,993 | 512² | `public/assets/models/props/PRP-006.glb`（0.32 MB，`dd813454…f70bcecc`），尺寸 1.07 × 2.0 × 0.5 m |
| PRP-007 | 柴堆 | Prop | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf12-392f-7072-8914-a692da780364` | 30 | 2,989 | 1024² | `public/assets/models/props/PRP-007.glb`（0.78 MB，`43d9b0e8…b4cc7a3f`），尺寸 1.94 × 1.1 × 1.2 m |
| CRT-001 | 林兔 | Creature | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf13-fe88-757b-ae9b-47e224f761f5` | 30 | 2,940 | 512² | `public/assets/models/creatures/CRT-001.glb`（0.41 MB，`67fb5e09…a346edd9`），尺寸 0.21 × 0.42 × 0.40 m |
| CRT-002 | 林鸟 | Creature | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1cf15-d9c8-74bc-9489-243650b52562` | 30 | 1,960 | 512² | `public/assets/models/creatures/CRT-002.glb`（0.33 MB，`c1815631…0660cb77`），尺寸 翼展 0.42 m（Meshy 建成竖立姿态，加载时转为水平） |

累计积分：848（此前 548 + 本批 300）。生成前余额 672，生成后脚本查询余额 372。VEG-010 重做后累计 878，余额 342（脚本查询）。

授权：2026-11-12 用户要求“再丰富场景中的模型或者别的元素”，选择植被多样性、环境动态粒子、营地与生活痕迹、小动物四个方向，Meshy 预算“约 10 件，≤ 300 积分”。脚本上限每件 1 次 / 30 积分，十件都一次成功，没有重试余量；参考图各用 codex-cli 生成 1 张，提示词与检查见 `assets/reference/<ID>/`。CRT 为新的“生物”类别（脚本已支持该前缀），产物放在 `public/assets/models/creatures/`。

- **初检（Claude，非用户验收）**：看了 Meshy 缩略图和游戏内截图，未在 Blender 中逐项检查法线和接缝。VEG-010 第 1 版的奶油色与浅粉色花簇几乎没被 Meshy 保留（贴图里只有零星粉色碎片），叶片偏尖碎，曾用着色器补花斑；2026-11-12 用户要求“重新调用 meshy 生成，效果优先”，授权本轮最多 2 次 / 60 积分。第 2 版参考图改为约 12 个大而饱满的球状花团、宽圆叶片，`target_polycount` 提到 8,000，1 次即成功（30 积分）：四个视角的缩略图和游戏内截图都能看到成团的粉色与奶油色花，着色器花斑已删除。近看（镜头 1 m 内）花团呈揉纸般的硬棱面，中远距离可辨认为花团。第 1 版原始文件保留在 `assets/meshy/raw/VEG-010/01a1cf02-…/`。VEG-009 树冠较稀疏。CRT-002 按参考图（正俯视）被建成竖立、腹部朝前，`Wildlife.tsx` 加载时绕 X 轴转 90° 并居中。
- **优化**：白桦、灌木、野花用 `optimize_tree.py`（生成 LOD1；VEG-010 第 2 版贴图 1024²、LOD1 上限 1,200，花的细节主要在贴图里）；其余用 `optimize_static.py`。`.blend` 存于各原始任务目录（不纳入版本管理）。
- **集成**：白桦是 `forestLayout.ts` 的第四种树（只种在林缘与空地边，上限 80 棵），有碰撞与遮挡。灌木（约 170 丛，有圆形碰撞）、野花（成片分布在空地与林径边）、树桩（约 46 个，有碰撞）、路标（3 个林径分岔口）在 `sceneryLayout.ts`；篝火、木箱木桶、柴堆在 `campLayout.ts`（木屋局部坐标），篝火旁 3 个小树桩（VEG-012 缩放 0.5）作座位。兔子 16 只、鸟群 3 群 × 7 只，见 `features/ambient/Wildlife.tsx`；二者都是静态网格，动作由代码驱动。

## 视觉对齐资产（2026-11-12）

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数 | 贴图规格 | GLB 与尺寸 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INT-004 | 发光百合 | Interactive | 高 | 已集成 | `front.png`（codex-cli 生成） | `01a1cfb3-ddf8-73ba-b50e-e2199a297b27`（meshy-6） | 30 | 5,879 | 1024² BaseColor / Normal / MetallicRoughness / Emissive | `public/assets/models/interactive/INT-004.glb`（1.11 MB，`6cca7267…8c3d828c`），尺寸 1.04 × 1.1 × 0.87 m |
| PRP-008 | 手提灯笼 | Prop | 高 | 已集成 | `front.png`（codex-cli 生成） | `01a1cfb8-0ae5-70c3-b214-ad0a0bcaa3f9`（meshy-7.1） | 30 | 2,940 | 512² BaseColor / Normal / MetallicRoughness（无 Emission） | `public/assets/models/props/PRP-008.glb`（0.37 MB，`63837621…6d13b699`），尺寸 0.16 × 0.32 × 0.14 m |

SHA-256：INT-004.glb `6cca7267283cddfef769f6b78e1870c20ee09a9a933d977c54fb26468c3d828c`；PRP-008.glb `638376215aebee146234597dbb92e30e43a7eeaa93a3c2e8a11dfd956d13b699`。

累计积分：938（此前 878 + 本批 60）。授权：2026-11-12 用户在“对照设计图补差距”时选择“两件都做，≤ 80 积分”；脚本上限每件 1 次 / 30 积分，两件都一次成功，未重试。参考图各用 codex-cli 生成 1 张，见 `assets/reference/<ID>/`。

- **初检（Claude，非用户验收）**：看了 Meshy 缩略图、贴图与游戏内截图，未在 Blender 中逐项检查法线和接缝。INT-004 的 Emission 贴图覆盖花瓣与花蕊、不含叶片，可直接用于代码驱动的发光。PRP-008 没有 Emission 贴图，玻璃在底色里画成浅灰；`HandLantern.tsx` 在着色器里把“亮且低饱和”的像素（玻璃与蜡烛）作为发光区域。
- **优化**：两件都用 `optimize_static.py`：INT-004 高 1.1 m、贴图 1024²；PRP-008 高 0.32 m（含提环）、贴图 512²。`.blend` 存于各原始任务目录（不纳入版本管理）。
- **集成**：INT-004 取代 INT-001 作为全部可唤醒的花（`features/flora/GlowFlowers.tsx`，布局不变）。PRP-008 挂在 CHR-001 的 `RightHand` 骨骼下方，保持竖直并按手的加速度摆动（`player/HandLantern.tsx`），暮光下是一盏实时点光源（`LocalLights`）。

## 后续类别（未规划具体资产）
Props、Creatures 暂无条目。新增资产时先在本表登记为 `规划`，再进入流程。
