# 工程架构

## 2026-11-23 四维综合优化补记（已实现）

- **会话复位与状态健壮性**：新增 `src/game/session.ts` 集中复位游玩瞬态状态（航线、萤火群、关口、时段、镜头演出、提示、秘密、光脉、出生点与音频）；`gameStore.ts` 引入 `createSafeStorage`（容错 + 写入去重）、`sanitizeSettings` 白名单校验、FIFO 字幕队列（`captionQueue`/`advanceCaption`）与区域横幅显隐位；`World.tsx` 改由纯 `useMemo` 读取出生点并处理 `pagehide` 存盘与 WebGL `webglcontextlost`/`webglcontextrestored` 恢复；`App.tsx` 的 `ErrorBoundary` 包裹整页且 `camera.near` 提到 `0.25`；`vite.config.ts` 按 `three`/`r3f`/`react` 拆分生产包。
- **渲染管线与 GPU 生命周期**：`PostFX.tsx` 改用直连 RenderTarget 管线（MSAA + 深度主目标 + 无 MSAA/无深度 ping-pong），高画质 `GTAOPass` 改为半分辨率纯深度模式（不再整场景重绘法线/深度），修复小窗除零与 DPR 调整，并完整 `.dispose()` 全部 Pass/RT；`Precompile.tsx` 在匹配线性 HDR 的半浮点离屏目标上预编译；`Sea.tsx` 拆分为近岸细海湾与远海粗网格（减面约 96%）、使用 WebGL2 兼容 `HalfFloatType` 海床纹理与解析梯度噪声；`Ground.tsx` 将近地切分为视锥剔除瓦片；`worldMaterial.ts` 修复后挂载 `cameraFade` 竞态；`Water.tsx` 加入反射距离门控、递归保护与低画质渐变着色；`Cabin.tsx` 点光并入 `LocalLights`；`Scatter.tsx` 增加 LOD ±2 m 滞回；各渲染与粒子模块补齐 `.dispose()`。
- **操控、镜头、音频与界面解耦**：`input.ts` 支持灵敏度/上下逆向设置与未锁指针拖拽环视；`camera/arm.ts` 用平滑过渡取代树冠 2.8 m 跳变，`FollowCamera.tsx` 补外围树与高地岩遮挡、三点地形/桥面防穿地与动态 FOV；`audio/engine.ts` 修复瞬态恢复失败锁死、加入淡入淡出暂停、提高脚步/水花 `refDistance` 并扩展交互音效；`LoadingVeil.tsx` 淡出后卸载内部动画节点；`style.css` 将 `.objective` 移至左上防止 720p 叠字并支持短屏滚动。
- **玩法连贯性扩展模块**：新增 `features/resonance/resonance.ts`（纯规则单测：唤光半径/远距唤花/流光时长随种子成长、冷却与倍速）、`ResonanceDirector.tsx`（F/右键共鸣脉冲、延时空间回声柱、远距唤花、高地蓄光脉冲协同与流光拖尾）、`WetlandRelay.tsx`（湿地跨水折射光弧与涉水传导提示）、`features/secrets/ResonanceArcs.tsx`（四处支线到古树树冠的天际光弧）与 `features/campfire/HearthDirector.tsx`（营地篝火近距记忆回溯）；全部高频状态留于帧循环共享对象，仅在连行计数/秘密数/篝火近距变化时写入 Zustand store，新几何与着色器均完整 `.dispose()`。
- **2026-11-24 场景、音效与动效协同架构**：新增 `rendering/wind.ts`（纯函数驱动全球风向与阵风，同步至 `worldMaterial.ts`、`Grass.tsx`、`AmbientLife.tsx`、`AirEffects.tsx` 与 `audio/engine.ts` 风声滤波器）；`Grass.tsx` 接入 `resonance` 唤光半径在草尖形成实时发光涟漪；`audio/engine.ts` 新增程序化 2.1 s 立体声 `ConvolverNode` 森林混响、母带 `DynamicsCompressorNode` 软限幅、高地松涛与夜间猫头鹰、以及藤桥/光桥/迷雾/种子入灯连续事件音效；`Character.tsx` 与 `HandLantern.tsx` 叠加转弯倾身/坡度贴合/唤光脉冲次级惯性；`FollowCamera.tsx` 提供尊重 `prefers-reduced-motion` 且经 `safeCameraArm` 约束的事件微镜头呼吸；`VineBridge.tsx`/`VineLeaves.tsx` 与 `Seeds.tsx`/`flock.ts` 改为着色器错峰蔓生、弹性出叶、贝塞尔入灯与螺旋飞行。
- **2026-11-24 地图环路与岛内扩展架构**：
  - `world/regions.ts`：`worldBounds` 延展至约 `242 × 498 m`（X `[-130, 112]`，Z `[-124, 374]`）。新增常开新区域 `VALE_PASS`/`VALE`、`REEF_CAUSEWAY`/`REEF`、`STAR_PASS`/`STAR_CLIFF`，以及三条随原有关口联合门控的连通走廊 `GLEN_LAKE_TRAIL`、`HOLLOW_VALE_TRAIL`（随 `northOpen`）与 `EAST_RIDGE_TRAIL`（随 `ascentOpen`），并由 `FireflyRoute.tsx` 挂载对应 `GateMist`、由 `navigation.ts` 提供分区双端退出引导。
  - `terrain.ts` / `surf.ts` / `Sea.tsx` / `grassField.ts`：`beachProfile()` 仅在 `WATERLINE`（`Z < -86`）以南叠加干地沙堤与 `REEF` 岩石台（原 `BEACH` 剖面零改动），同步外扩 `COVE_RECT`/`COVE_MESH`/`coveSurge` 并排除海岸以南草片；高地以北叠加 `starLift` 与 `northSeaCliffWeight` 北海崖，追加 5 条林径于 `paths` 末尾（不改动 `paths[0..1]`）。
  - `forestLayout.ts` & `Forest.tsx`：`outerTrees` 改为基于世界整数晶格 `(ix, iz)` 的确定性哈希随机，解耦 `worldBounds` 外延与既定营地边缘红杉位置；可走树木 `TREE_CHUNK` 调至 `28` 以平衡新增区域后的绘制调用数。
  - `features/route/progress.ts` / `save.ts` / `features/secrets/*` & `sideLayout.ts`：`SecretId`/`SECRET_IDS` 扩展为 6 处，`seeds` 在保留 `0..11` 索引（v2 存档零破坏）的前提下追加 `12..15`；`secrets.ts` 与 `SecretsDirector.tsx` / `SideFeatures.tsx` / `ResonanceArcs.tsx` 新增阳石林谷限时 4 柱唤光联动、望海石台 3 柱与北崖星台 `KeyE` 交互（复用已有 Meshy GLB 与 `LocalLights`、`reflectionSkips` 并在卸载时完整 `.dispose()`）。

## 2026-11-15 整体优化补记（已实现）

第二次打磨：`Sea.tsx` 将粗糙天空反射与细波法线分开，并以 `userData.aoSurface` 明确参加 GTAO 的平面法线/深度渲染，阻止水下地形接缝的 AO 被乘到海面；该通道不重现细小浪面位移。`terrain.cliffWeight` 的外侧退台不进入 GLEN 可走岸边，落水口附近保留旧剖面；`Ground.tsx` 用独立 0.5 m 崖壁网格替换主网格同区域，细网格边界插值到粗边以避免裂缝。`groundMaterial` 分别投影地面 xz 与岩面 zy，混合材质权重，不混合绝对坐标；岩面用风化色与不规则裂隙。`grassField` 排除岩面，`Grass.fieldAt` 按已读取四点的高度差抑制陡单元密度，避免密度插值带入悬草，无额外纹理采样。`landmarkView.ts` 给古树入口的蕨类/灌木布局留出视线通道，保留其他位置的随机序列；灌木碰撞仍从同一最终布局生成。

- `timeOfDay.journeyBlend` 用营地、湿地、高地的阶段锚点与访问下限合成 0–2 曲线；`Atmosphere` 从已有持久化字幕标记读取已访问区域，日光奖励仅作 0.3 下限，无新存档字段。
- `camera/arm.ts` 把基础臂长、演出后拉和抬升先合成最终射线，再统一做硬遮挡与树冠检查。近处树冠保留原像素淡出策略，小型植被加入同一材质淡出；不执行全场景逐三角形射线。
- `secrets/session.ts` 向目标层暴露当前秘密会话；纯函数 `secrets/objective.ts` 根据本地区域、步骤和已取得奖励生成线索。`RouteGuidance` 管理 T 切换与离区重置，继续最多每秒 4 次写入变更后的 HUD，不逐帧写 React 状态；未解回声只提示倾听，不暴露下一块石头。
- `route/conduit.ts` 是可单测的高地顺序/朝向/蓄光规则；`ConduitDirector` 读相机水平朝向与 E，更新共享瞬态进度和光束。`RouteDirector` 仅在对应光脉 ready 时调用原点灯/扣除/声音逻辑；营地与湿地自动点灯不变。暂停冻结蓄光，未完成蓄光不保存，既有 lit 位图兼容旧的非顺序点灯存档。
- 结局卡继续按钮显式恢复 playing 再请求鼠标锁，避免演出释放鼠标后焦点保护留下暂停态。`debugApi` 增加只读光脉快照供真实按键用例验证。
- 水体、地形与雾的收敛沿用已有渲染模块，未新增模型请求、外部依赖、后端或区域加载系统。字体子集源加入 `RouteGuidance.tsx` 与新秘密目标文字。

2026-11-15 白天视觉：日间预设、草地/叶片/苔藓颜色按 `1 - atmosphere.blend` 混合；白天开局褪色减弱，暮光/夜晚恢复原端点强度。`sunlight/landform.ts` 用扰动椭圆的距离近似统一地形深度、草地排除与碰撞边缘；`collision.ts` 沿梯度推回安全岸线，桥成后只开放桥面，替换矩形墙。`Ground.tsx` 切掉粗网格相同区域，用对齐边界的 0.25 m 局部网格承载岸坡。`SunlightBanks.tsx` 分块实例化已有 Meshy 布景，`VineLeaves.tsx` 用单个实例网格给临时根系补枝叶；`safeSunlightSpawn` 按新岸缘迁移旧岛角/坡地存档并保留桥上位置。验证见 PROGRESS.md。

2026-11-14 白天样板新增 `features/sunlight/`：`layout.ts` 为镜位、保留空地、沟壑墙体与桥面高度的共同来源；`terrain.ts` 切出静态干沟壑；`progress.ts` 是可单测的两镜光路、生长与兼容存档规则；`objective.ts` 提供局部动作目标；`SunlightDirector.tsx` 处理 E/Q、暂停/日光门控、生长、奖励完成与保存请求；`SunlightOptics.tsx`、`VineBridge.tsx`、`Sunlight.tsx` 分别负责临时光学几何、临时藤桥与已有 Meshy 配景。`Player` 共享沟壑墙体和动态桥面，`FollowCamera` 补挡光岩石的遮挡代理。`RouteGuidance` 优先采用有条件的白天目标，`SunlightPanel` 显示低频互动反馈。`save.ts` 在 v2 中增加可选字段，安全迁移旧沟壑位置；`journeyBlend` 在取得样板奖励后加入傍晚偏移，固定时段优先。细节与边界见[样板说明](DAYLIGHT_SAMPLE.md)。

## 已实现
`app` 管理入口和 Canvas，`world/zones` 组装灰盒，`world/zones/forestLayout.ts` 是树木布局的唯一数据源（渲染、碰撞圆、遮挡圆柱）；`Forest.tsx` 加载 VEG-001 GLB，用两个 InstancedMesh 按距离分 LOD（`treeLod.ts`），碰撞与遮挡仍用代码代理，不对渲染网格做射线检测。`world/zones/campLayout.ts` 定义木屋（`Cabin.tsx`，ARC-001）的位置、旋转盒体碰撞与圆柱遮挡代理，以及发光植物位置；`features/flora/GlowFlowers.tsx` 加载 INT-001，按与玩家的距离在帧循环里直接改材质发光强度（`glow.ts`）。`input` 维护非 React 高频输入，`input/focus.ts` 处理失焦、隐藏标签页、指针锁丢失的自动暂停。`player` 用纯函数 `movement.ts`（速度平滑、角度插值、边界）和 `collision.ts`（圆形推出、旋转盒体推出）更新共享的位置/速度向量，`Character.tsx` 加载 CHR-001 并按 `gait.ts` 选择动作；`camera` 在角色更新后跟随，`camera/occlusion.ts` 计算射线与竖直圆柱的最近交点。`rendering` 提供像素比档位，`assets` 提供模型根路径，`ui` 显示界面，`state` 用 Zustand 管理低频状态（阶段、指针锁、设置）。`debug/debugApi.ts` 仅在开发模式或 `?debug` 下暴露测试钩子。

P3 起：`world/regions.ts` 用矩形并集（营地、北侧走廊、湿地）定义可行走区域，`clampToRegions` 取代原来的方形边界，`gates` 是帧循环拥有的关口状态（走廊关闭时不计入可行走区）；地形起伏与远景树按到区域并集的距离生成，天空球跟随相机。`features/route` 实现萤火航线：`routeLayout.ts`（灯笼位置、朝向、碰撞圆、各区域终点）、`progress.ts`（纯函数规则：放出萤火、点灯、区域完成、关口计时，以及只在游玩时推进的 `routeClock`）、`flock.ts`（跟随角色与飞向灯笼的萤火模拟），`RouteDirector.tsx` 每帧应用规则并播放和弦，`Lanterns.tsx`（INT-002）、`RouteParticles.tsx`（引路萤火与萤火流的点精灵）和 `GateMist.tsx`（单次绘制的实例化迷雾）负责表现。`shared/` 放跨模块的纯工具（确定性随机数、smoothstep）。

湿地：`world/zones/wetlandLayout.ts` 定义水塘（浅/深）、深水渠、林径、花与空地，`basinDepth()` 让地形在水下下沉；角色高度在湿地跟随地面（涉水），光桥上固定为 0。`world/zones/floraLayout.ts` 汇总三处的花（营地在前，索引不变），`forestLayout.ts` 在湿地干地上追加 16 棵树（拒绝采样，自动避开水、林径、花和灯笼）。`world/zones/Water.tsx` 是一块覆盖湿地与水渠的透明水面，着色器用与 `basinDepth()` 相同的水塘公式在浅处淡出，使岸线圆润，并显示涉水涟漪；涉水时 `soundscape.splash()` 发出空间水声。`rendering/timeOfDay.ts` 的 `applyWetlandTint()` 按 `atmosphere.wetland`（由角色位置平滑得到）调冷雾色与雾距，音频随之切换湿地层。`features/route/LightBridge.tsx`（实例化光垫）与 `RouteParticles.tsx` 中的空地光柱负责湿地航线的结尾表现。P4：`world/zones/highlandLayout.ts` 定义坡道高度场 `elevation(z)`（北方整体抬升，山丘叠加其上）、古树、灯座、花与坡道岩石；`regions.ts` 增加坡道（`gates.ascent`）与高地平台，`walkableRegions` 按三个关口组合缓存。遮挡圆柱支持底部高度，跟随镜头不低于地面 0.5 m，结局时后拉并抬向树冠。`world/zones/Highland.tsx` 渲染古树（`onBeforeCompile` 补丁：按高度分段点亮、从 BaseColor 抠出光纹、程序化流动光线、树冠辉光）和实例化岩石。`features/route` 扩展为三个区域，节点分灯笼柱（post）与灯座（cradle），由同一个 `Lanterns.tsx` 按种类渲染；`GateMist` 参数化后用于走廊与坡道两处。`guide.ts`（字幕文案、按区域选择下一个目标）、`save.ts`（序列化/校验/恢复、localStorage 读写、继续时的出生点）、`HintPulse.tsx`（停滞提示光柱）由 `RouteDirector` 驱动；`audio/music.ts` 给出声部数与和声，`engine.ts` 用前瞻调度器排音。低频 UI 状态（字幕、结局卡）存放在 Zustand store。

场景升级（2026-11-12）：`world/scale.ts` 的 `WORLD_SCALE` 统一放大区域、林径、水塘、花与关口（资产尺寸、角色可达距离和林径宽度不放大）；地形加入 `rolling()` 起伏，`rollWeight()` 在湿地、空地和木屋、古树处为 0。`rendering/scatterChunks.ts` + `Scatter.tsx` 是通用的分块实例化：每个约 20–32 m 的块是一个带包围球的 InstancedMesh，整块视锥剔除，按块到相机的距离切换 LOD 或隐藏；树木、地表植被与配景都用它。`rendering/grassField.ts` 把地面高度和草密度烘焙成浮点纹理，`Grass.tsx` 用一组跟随相机平铺换位的实例化草片绘制（数量随画质）。`rendering/AirEffects.tsx` 是光束与低雾（各一次绘制）。`world/zones/sceneryLayout.ts` 生成全部布景并导出碰撞（倒木、栅栏为盒体，大苔石为圆）、草地避让区和木桥桥面高度 `deckHeight()`；`Player` 取地面与桥面中较高者为脚下高度，`Water` 按角色实际脚下高度判断是否涉水。

视觉升级（2026-11-12）：`rendering/PostFX.tsx` 用 Three.js 自带的 EffectComposer（4× MSAA 半浮点目标）→ UnrealBloom → OutputPass（色调映射与 sRGB）→ 调色 ShaderPass；它以优先级 1 的 useFrame 接管渲染，并手动清零 `gl.info`，使调试统计覆盖整帧（含阴影与后期）。天空着色器加入太阳光盘与光晕，`atmosphere.sunDirection` 供草地等读取；`Atmosphere` 另有一盏跟随相机的补光，太阳阴影覆盖 ±40 m（高画质 4096²）。`Grass.tsx` 改用 `MeshLambertMaterial` + `onBeforeCompile`（受光、接收阴影、雾），背面不翻转法线；踩踏用 8 个足迹点（玩家当前位置 + 最近脚印，衰减约 1.8 s）把草推开压低。`soundscape.footstep()` 按地面（草、土路、木桥）合成空间脚步声；`wetlandLayout.wading()` 以“脚低于水面且脚下是水塘或水渠”判断涉水（地形起伏后，营地低洼处也可能低于水面，但不算水里）。

灯光与森林（2026-11-12）：`rendering/LocalLights.tsx` 持有固定数量的点光源（按画质 2–4 盏，`config.localLights`），灯笼、灯座与花把自己登记为 `lightSources` 并每帧写入亮度；按到镜头的距离加权选出最近的几个，换源时先淡出再淡入，远处按距离淡出，因此光源总数不变、不重编译、不跳变。`forestLayout.ts` 的树木布局改为：`standDensity()`（低频噪声）决定密林与空地，各树种按密度取不同的扎根概率（幼树偏向林缘与林径旁），大红杉带出一圈子树，`sentinels()` 沿林径不规则地放大树；数量常量现在是上限，用固定尝试次数，使空地不会被补满。幼树之间允许较小间距（`THICKET_GAP` 1.4 m），其他树之间仍保留 2.6 m 可通行间隙。

场景丰富（2026-11-12）：`features/ambient/AmbientLife.tsx` 是一组代码粒子，路径、翻转与扇翅全在顶点着色器里按时间计算，每种一次绘制、无逐帧 CPU 循环。飘叶与尘埃像草一样在玩家周围的方块内循环平铺，蝴蝶与蜻蜓的栖息点由 `ambientLayout.ts` 给出。`features/ambient/Wildlife.tsx` 渲染野兔与鸟群（实例化）：兔子行为是纯状态机 `rabbits.ts`（吃草、绕家小跳、玩家 4.5 m 内受惊逃跑、10 m 外平静），鸟群是时间的纯函数 `birds.ts`（每 26 s 一群从玩家附近掠过），扇翅由材质 `onBeforeCompile` 按实例序号错开。`world/zones/Campfire.tsx` 生成火焰（三片交叉面片加噪声着色器）、火星与烟，并把篝火登记为 `LocalLights` 光源。白桦作为第四种树进入 `forestLayout.ts`（只种在林缘与空地边，常两三棵一起）；灌木、野花、树桩、路标在 `sceneryLayout.ts`，营地摆设在 `campLayout.ts`（以木屋为参照的局部坐标），都有对应的碰撞。

`rendering/Precompile.tsx` 在场景挂载后预编译全部材质（包括隐藏的萤火流、光桥和光柱），避免着色器在游玩中途首次编译造成卡顿。

每帧通过共享可变向量和 R3F 帧循环协调，不逐帧 setState；时间步长有限制。指针锁状态和暂停是低频事件才写入 store。设置使用 localStorage，进度存档尚未实现。

测试分两层：Vitest 覆盖纯函数（`src/**/*.test.ts`）；Playwright（`e2e/*.e2e.ts`）对生产构建做浏览器交互与性能基线，通过 `?debug` 钩子读取状态和摆放场景。

界面与视觉对齐（2026-11-12）：`src/ui/` 按画面拆分——`Overlay.tsx` 只负责按阶段选择画面；`TitleScreen.tsx`（含开局、继续与新旅程逻辑，用 drei 的 `useProgress` 显示预载进度）、`LoadingVeil.tsx`、`Hud.tsx`、`Settings.tsx`（设置与按键说明）、`decor.tsx`（叶形、灯笼图标、CSS 飘萤）。样式在 `app/style.css`，字体与首页图由 Vite 打包（带哈希）。Zustand 新增三项低频状态：`worldReady`（`rendering/Precompile.tsx` 在第一次异步编译完成并画过 6 帧后置为 true，加载层据此淡出；离开游戏时复位）、`region`（`RouteDirector` 检测区域变化后写入，带 1.2 秒防抖）、`journey`（点灯数与携带萤火数，变化时才写）。`App.tsx` 的 Suspense 不再显示文字后备，由加载层覆盖。`player/HandLantern.tsx` 每帧取 `RightHand` 骨骼的世界位置作为挂点，灯笼以世界坐标的阻尼摆动保持竖直，再换算到角色父节点的坐标；发光区域由着色器从底色中提取，光源登记到 `LocalLights`。`features/flora/GlowFlowers.tsx` 改用 INT-004，所有花的唤醒光点共用一个 Points（每朵 22 颗），在帧循环里按唤醒后的时间计算。`RouteParticles.tsx` 给跟随萤火加了拖尾（每只 7 个历史点，另一个 Points）。天空着色器（`rendering/Atmosphere.tsx`）在地平线圆上采样噪声生成云带与远山，避免方位角接缝。
排布与碰撞（2026-11-12 第二轮）：`terrain.groundUnder(x, z, r)` 取中心与两圈各 12 个采样点中最低的地面高度；树（`forestLayout.treeBase`，按树种根盘半径 `spread`）、倒木、栅栏、灌木、树桩、苔石、高地岩石都按各自底面半径落在这个高度上。树种的 `trunk` 改为实测的膝到腰高处根盘半径（红杉 3.5、冷杉 1.0、白桦 0.36），同时用于碰撞与间距；`core` 是树干本身，只用于镜头遮挡。树桩、灌木、苔石的碰撞半径同样按实测放大。倒木避开出生空地（布局重排后曾有一根落在出生点北边 5 m，单元测试已覆盖）。木桥的可走高度按实测剖面 `deckProfile`，两侧栏杆为 `bridgeRailColliders`。光桥（`features/route/LightBridge.tsx`）是拱形桥面、管状扶手、光柱、倒影与光点组成的一个组，`regions.bridgeDeck(z)` 给出拱高，角色在光桥上随之升降。`PostFX` 在渲染通道后加 `GTAOPass` 的子类（只在高画质启用），法线通道中隐藏点、精灵、透明与自定义着色器物体以及标记 `userData.noAO` 的草地；调色通道加入胶片颗粒与边缘色散。
第三轮（2026-11-12）画面：`rendering/AtmospherePass.ts` 在场景渲染后立即执行，读取场景深度（合成目标带 DepthTexture）重建世界坐标，叠加低层高度雾（朝太阳方向混入阳光色）、半分辨率屏幕空间光束（只取天空像素向太阳径向模糊）、复色圈（`features/route/revive.ts` 由进度算出圆心、半径与光波强度，未复色处褪色偏冷）；最后丢弃 NaN/无穷像素，防止经泛光扩散成整屏黑。`rendering/worldMaterial.ts` 给 Meshy 植被材质打一次补丁：按底色识别叶片，加逆光透射、边缘光、根部压暗和随风摆动，共享 `worldUniforms` 由 Atmosphere 每帧更新；`Scatter` 的 `foliage` 选项启用。`rendering/planarReflection.ts` 为水面做平面反射（镜像相机 + 斜裁剪面，按画质 0/0.35/0.5 倍分辨率，只在水面可见时由 onBeforeRender 渲染，草地经 `reflectionSkips` 排除）；`Water.tsx` 按区域可放多块水面（湿地含镜湖、瀑布溪谷）。草地加入大尺度色块。时段：`timeOfDay.journeyBlend()` 按点亮的灯数与所在区域给出目标时段，设置值 `journey` 为默认（store 持久化升到 v2 并迁移）。

第三轮扩图与玩法：`world/regions.ts` 新增四个支线区域及其山口（`sideRegions`，始终可走）；`terrain.ts` 加入瀑布峭壁（`cliffWeight`，带岩层顶点色）与眺望台外的山谷下陷（`valleyWeight`），新增四条支线林径；`wetlandLayout.ts` 的水塘表加入深潭、溪流与镜湖，`islands` 让湖心岛露出水面（着色器同步）。`world/zones/sideLayout.ts` 是支线区域布置与 12 颗种子位置的唯一数据源。`features/secrets/` 中 `secrets.ts` 是纯规则（单测），`SecretsDirector.tsx` 每帧执行规则、音效、字幕与镜头时刻（`FollowCamera.cameraMoment`），`fx.ts` 是渲染读取的帧循环状态，`SideFeatures.tsx`、`Seeds.tsx` 负责表现；`world/zones/Waterfall.tsx` 是代码瀑布，`features/route/Beacon.tsx` 是古树地标光柱。进度对象新增 `releasedAt`、`seedsAt`、`secretsAt`；存档 v2。

第三轮之二（2026-11-13）：时段刻度扩为 0–2（`timeOfDay.blendPresets` 两段插值，`TIME_POINT`、`journeyBlend` 返回 0–2，`atmosphere.time/blend/night`），夜晚预设把平行光换成月光；天空着色器加星空、银河、月亮、流星与远岛，月亮方向在 `atmosphere.moonDirection`。海岛：`terrain.seaWeight/seaCliffWeight` 与 `SEA_LEVEL/SEABED`，`Ground.tsx` 分近处与外圈两块网格（外圈尺寸按 4 m 对齐，近处下方的外圈顶点下沉），`world/zones/Sea.tsx` 为跟随相机的海面（烘焙 3 m 海床高度纹理）。`Waterfall.tsx` 重写为受光照的多层水幕与 GPU 粒子。着色器约定：可能为负的 `pow` 底数一律先 `max(…, 0)`；后期的 NaN 防护按位判断，因为 `isnan()` 可能被编译器优化掉；点精灵尺寸设上限并在镜头前淡出。

## 计划
按实际功能增设模块，不提前创建空壳：`features/flora`（发光植物、唤醒光波）、`features/firefly`（萤火粒子）、`features/route`（萤火航线）、`audio`（Web Audio 实时合成的环境声与空间音符，单例引擎 + 场景内 `SoundscapeDriver` 桥接设置与帧循环）、`shared` 已存在；新区域沿用区域并集、高度场与航线节点扩展；存档格式带版本号，布局改变时旧存档被忽略。碰撞与遮挡继续使用代码维护的代理体，不对渲染网格做逐帧射线检测。四种模型目前经 drei `useGLTF` 加载，树木已有实例化和 LOD；按区域加载与释放、纹理及网格压缩仍需随真实资源制定。Low/Medium/High 将扩展为经测量的完整渲染预算。部署使用 Vite 相对 base 与静态文件，无后端。


外围树 LOD（2026-11-13）：外围树可距可行走边界仅 3 m，不再固定使用 LOD1；与场景树一样按分块最近距离选择 LOD。红杉 LOD1 网格存在明显破面，暂将切换距离提高到 80 m；这不是网格修复，远景仍需重新优化并验收，近中景渲染开销有所增加。


海湾材质（2026-11-13）：`Sea.tsx` 在既有海床高度图基础上用多频动态噪声法线与像素足迹过滤控制波面，近岸按水深生成泡沫；`terrain/groundMaterial.ts` 在原有受光地面上按海湾范围和水位叠加沙粒、风纹与湿沙。海面仍是自定义着色器，不是平面反射或真实折射。


海湾接缝（2026-11-13）：`beachProfile` 在可行走边界外生成弯曲水线和连续下沉的海床，在岸上叠加淡出至水边的低起伏。海面裁切交由地面深度测试，海床纹理只驱动水色和浪花；海湾另烘焙 0.75 m 局部高度图，纹理坐标按像素中心对齐。


海湾冲滩（2026-11-13）：`terrain/surf.ts` 提供共享 GLSL 波浪函数和时间 uniform；`Sea.tsx` 使用细分海面在海湾局部升降并按水深生成推进浪带和泡沫，`groundMaterial.ts` 用同一函数使湿沙随冲刷变化。水面为视觉表现，不参与角色碰撞。

主线引导（2026-11-14）：`features/route/navigation.ts` 根据进度生成常驻目标文案、局部路点与区域进度，并计算相对视角的方位；返回支线山口、穿走廊、跨光桥与爬坡按局部路点分段指引，不承担障碍物寻路。`RouteGuidance.tsx` 在帧循环中最多每 0.25 s 采样一次，保留仍有效的行动目标，仅在文案、整数米距离或按 10° 量化的方向变化时调用 store 的 `setObjective`。`navigationFocus` 共享当前目标给 `RouteDirector` 的停滞光柱与声音；首次就绪/目标切换也会使用原有 `HintPulse`。`ui/Objective.tsx` 单独订阅这份非持久化状态，`Hud` 改用分字段订阅，避免指南针刷新连带重画整个 HUD。原有字幕和玩法进度逻辑保留，停滞周期改为 12 s；字体子集脚本追加目标文案源。

质感与开局收敛（2026-11-14）：`Grass.tsx` 同一实例预算按四片成簇分布，增加独立形体属性、收零尖端与大尺度色块，覆盖半径为 23 m；`groundMaterial.ts` 对近/远地形共用世界坐标纹理细节、导数过滤与轻微法线起伏，陡面改用侧坐标并排除落叶。`PostFX/timeOfDay` 降泛光、去色散、减颗粒；各光效模块分别控制光源核心与光晕，篝火用普通透明合成，`Beacon` 按相机距离衰减近处光柱。

树冠与仰视：`camera/treeCanopies.ts` 依据 Meshy LOD0 的纵向径向包围范围建立分层圆柱；`occlusion.ts` 取径向与纵向射线区间交集，包括端面与竖直射线。`FollowCamera` 保留硬物体遮挡，中距离树冠可缩短相机臂，过近树冠交由 `worldMaterial` 的近镜头/角色视线像素淡出处理；`Atmosphere` 每帧更新视空间角色焦点。地面抬高相机时补偿瞄准点，以保留输入俯仰角；`input.ts` 上视界限改为 −0.45 rad。渲染状态仍在帧循环中，不逐帧写 React。

水体与布局：`Sea.tsx` 将法线噪声分层旋转、浅深色改为连续吸收，泡沫沿世界空间浪相位向海湾移动，水深只限制破碎范围；`surf.ts` 给海面和湿沙共享的波浪加入前后相位，`Waterfall.tsx` 在下落时间坐标上增加横向扰动与短段破碎。`campLayout.ts` 只调整六株营地花的位置为三组顺路布置，数量、索引和保存结构不变；布局约束测试与实际 W 步行浏览器测试覆盖开局。
