# 资产登记与预算

## 已实现
- 本清单的分类、字段与状态定义，以及第一批四种资产的规划条目。
- 尚无正式资产：没有调用 Meshy，积分支出为 0。灰盒几何体不登记为正式美术资产。
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

## 第一批：代表性资产（仅规划，未生成）

| ID | 名称 | 类别 | 优先级 | 状态 | 参考图 | Meshy Task ID | 生成积分 | 模型面数（暂定 LOD0 上限） | 贴图规格（暂定） | GLB 路径 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CHR-001 | 松果拾光者 | Character | 高 | 参考就绪（待补背视图、修正配件左右） | A 方案 3 张 | — | 0 | ≤ 20,000 | 2048² BaseColor / Normal / ORM | `public/assets/models/character/CHR-001.glb` |
| VEG-001 | 针叶树 | Vegetation | 高 | 规划 | 无 | — | 0 | ≤ 4,000；LOD1 ≤ 1,200 | 1024² BaseColor / Normal / ORM | `public/assets/models/vegetation/VEG-001.glb` |
| INT-001 | 发光植物 | Interactive | 中 | 规划 | 无 | — | 0 | ≤ 2,000 | 1024² BaseColor / Normal / ORM / Emissive | `public/assets/models/interactive/INT-001.glb` |
| ARC-001 | 森林木屋 | Architecture | 中 | 规划 | 无 | — | 0 | ≤ 15,000 | 2048² BaseColor / Normal / ORM | `public/assets/models/architecture/ARC-001.glb` |

累计积分：0。各资产的积分上限在授权时写入。

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
