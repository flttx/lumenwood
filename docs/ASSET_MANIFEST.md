# 资产登记与预算

## 已实现
- 本清单的分类、字段与状态定义，以及第一批四种资产的规划条目。
- VEG-001 针叶树：2026-11-10 生成（30 积分），用户采用，已优化并集成为 48 棵实例化树木，2026-11-10 用户确认视觉，状态 `可用`。其余资产未生成。地面与角色仍是灰盒几何体，不登记为正式美术资产。
- CHR-001 的已确认参考图已入库（`assets/reference/CHR-001-pinecone-gleaner/`，PNG 不纳入版本管理）。

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
| CHR-001 | 松果拾光者 | Character | 高 | 参考就绪（待补背视图、修正配件左右） | A 方案 3 张 | — | 0 | ≤ 20,000 | 2048² BaseColor / Normal / ORM | `public/assets/models/character/CHR-001.glb` |
| VEG-001 | 针叶树 | Vegetation | 高 | 可用 | `front.png`（codex-cli 生成） | `01a1c2fb-9c7c-76b4-bfad-a01f9df70604`（第 1 次，采用） | 30 | 3,987 → LOD0 3,987 → LOD1 1,176 | 1024² BaseColor / Normal / MetallicRoughness（JPEG，内嵌） | `public/assets/models/vegetation/VEG-001.glb` |
| INT-001 | 发光植物 | Interactive | 中 | 规划 | 无 | — | 0 | ≤ 2,000 | 1024² BaseColor / Normal / ORM / Emissive | `public/assets/models/interactive/INT-001.glb` |
| ARC-001 | 森林木屋 | Architecture | 中 | 规划 | 无 | — | 0 | ≤ 15,000 | 2048² BaseColor / Normal / ORM | `public/assets/models/architecture/ARC-001.glb` |

累计积分：30。授权上限：VEG-001 最多 2 次、60 积分（2026-11-10 用户授权，已用 1 次、30 积分）；其余资产未授权。

### CHR-001 松果拾光者
- **用途**：玩家角色，替换灰盒胶囊体。
- **参考**：A 方案，用户已确认；是唯一造型依据，详见 `docs/ART_DIRECTION.md` 第 3 节。来源与权利说明待用户补充。
- **待解决**：缺背视图；正视图与侧视图的皮袋、铜环左右相反。
- **尺寸**：游戏内身高待定。现有镜头注视高度 1.25 m、碰撞半径 0.35 m 以灰盒约 2 m 为基准，确定身高后同步调参。
- **动画**：idle / walk / run，按 `docs/ANIMATION_PIPELINE.md`；绑骨来源与许可待核实。
- **验收重点**：面部与眼睛的可读性；兜帽、叶片披肩、前后摆的穿插与蒙皮变形；手指。

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
- **尺寸**：待定，以角色身高为参照。
- **特殊需求**：发光部位必须能拆出 Emissive 贴图或独立材质；发光强度、呼吸和反应动画由代码驱动，粒子由代码生成。Meshy 可能不直接输出 Emissive，需在 Blender 中补绘。
- **验收重点**：暮光照明下的发光可读性；避免 exaggerated bloom 和 excessive neon。

### ARC-001 森林木屋
- **用途**：林间营地的地标建筑，验证大型静态资产的面数、贴图与碰撞代理。
- **风格依据**：Master Prompt 中的 cozy wooden structures、温暖木质、覆苔、与森林有可信联系；不得出现哥特式建筑元素（Negative Prompt）。
- **尺寸**：待定，门高以角色身高为参照；碰撞用代码盒体代理。
- **验收重点**：地标剪影；木纹与苔藓材质不嘈杂；面数在预算内。

## 后续类别（未规划具体资产）
Props、Creatures 暂无条目。新增资产时先在本表登记为 `规划`，再进入流程。
