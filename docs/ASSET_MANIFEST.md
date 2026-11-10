# 资产登记与预算

## 已实现
- 本清单的分类、字段与状态定义，以及第一批四种资产的规划条目。
- 第一批四种资产全部生成并集成（2026-11-10）。VEG-001 针叶树经用户确认为 `可用`；CHR-001 松果拾光者、INT-001 发光植物、ARC-001 森林木屋为 `已集成`，待用户在游戏内确认视觉后改为 `可用`。地面仍是灰盒几何体，不登记为正式美术资产。
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
| INT-001 | 发光植物 | Interactive | 中 | 已集成 | `front.png`（codex-cli 生成） | `01a1c5a5-99bc-767a-aa7f-d46fc8e57baa` | 30 | 2,002 → 1,959（≤ 2,000） | 1024² BaseColor / Normal / MetallicRoughness / Emissive（JPEG，内嵌） | `public/assets/models/interactive/INT-001.glb` |
| ARC-001 | 森林木屋 | Architecture | 中 | 已集成 | `front.png` + `three-quarter.png`（codex-cli 生成） | `01a1c5a9-7bfc-725b-8493-8f24167765a3` | 30 | 14,533（≤ 15,000，未减面） | 2048² BaseColor / Normal / MetallicRoughness（JPEG，内嵌） | `public/assets/models/architecture/ARC-001.glb` |

累计积分：128（VEG-001 30、INT-001 30、ARC-001 30、CHR-001 38）；2026-11-10 生成后余额 1092。

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

## 后续类别（未规划具体资产）
Props、Creatures 暂无条目。新增资产时先在本表登记为 `规划`，再进入流程。
