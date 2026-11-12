# 工程架构

## 已实现
`app` 管理入口和 Canvas，`world/zones` 组装灰盒，`world/zones/forestLayout.ts` 是树木布局的唯一数据源（渲染、碰撞圆、遮挡圆柱）；`Forest.tsx` 加载 VEG-001 GLB，用两个 InstancedMesh 按距离分 LOD（`treeLod.ts`），碰撞与遮挡仍用代码代理，不对渲染网格做射线检测。`world/zones/campLayout.ts` 定义木屋（`Cabin.tsx`，ARC-001）的位置、旋转盒体碰撞与圆柱遮挡代理，以及发光植物位置；`features/flora/GlowFlowers.tsx` 加载 INT-001，按与玩家的距离在帧循环里直接改材质发光强度（`glow.ts`）。`input` 维护非 React 高频输入，`input/focus.ts` 处理失焦、隐藏标签页、指针锁丢失的自动暂停。`player` 用纯函数 `movement.ts`（速度平滑、角度插值、边界）和 `collision.ts`（圆形推出、旋转盒体推出）更新共享的位置/速度向量，`Character.tsx` 加载 CHR-001 并按 `gait.ts` 选择动作；`camera` 在角色更新后跟随，`camera/occlusion.ts` 计算射线与竖直圆柱的最近交点。`rendering` 提供像素比档位，`assets` 提供模型根路径，`ui` 显示界面，`state` 用 Zustand 管理低频状态（阶段、指针锁、设置）。`debug/debugApi.ts` 仅在开发模式或 `?debug` 下暴露测试钩子。

P3 起：`world/regions.ts` 用矩形并集（营地、北侧走廊、湿地）定义可行走区域，`clampToRegions` 取代原来的方形边界，`gates` 是帧循环拥有的关口状态（走廊关闭时不计入可行走区）；地形起伏与远景树按到区域并集的距离生成，天空球跟随相机。`features/route` 实现萤火航线：`routeLayout.ts`（灯笼位置、朝向、碰撞圆、各区域终点）、`progress.ts`（纯函数规则：放出萤火、点灯、区域完成、关口计时，以及只在游玩时推进的 `routeClock`）、`flock.ts`（跟随角色与飞向灯笼的萤火模拟），`RouteDirector.tsx` 每帧应用规则并播放和弦，`Lanterns.tsx`（INT-002）、`RouteParticles.tsx`（引路萤火与萤火流的点精灵）和 `GateMist.tsx`（单次绘制的实例化迷雾）负责表现。`shared/` 放跨模块的纯工具（确定性随机数、smoothstep）。

湿地：`world/zones/wetlandLayout.ts` 定义水塘（浅/深）、深水渠、林径、花与空地，`basinDepth()` 让地形在水下下沉；角色高度在湿地跟随地面（涉水），光桥上固定为 0。`world/zones/floraLayout.ts` 汇总三处的花（营地在前，索引不变），`forestLayout.ts` 在湿地干地上追加 16 棵树（拒绝采样，自动避开水、林径、花和灯笼）。`world/zones/Water.tsx` 是一块覆盖湿地与水渠的透明水面，着色器用与 `basinDepth()` 相同的水塘公式在浅处淡出，使岸线圆润，并显示涉水涟漪；涉水时 `soundscape.splash()` 发出空间水声。`rendering/timeOfDay.ts` 的 `applyWetlandTint()` 按 `atmosphere.wetland`（由角色位置平滑得到）调冷雾色与雾距，音频随之切换湿地层。`features/route/LightBridge.tsx`（实例化光垫）与 `RouteParticles.tsx` 中的空地光柱负责湿地航线的结尾表现。P4：`world/zones/highlandLayout.ts` 定义坡道高度场 `elevation(z)`（北方整体抬升，山丘叠加其上）、古树、灯座、花与坡道岩石；`regions.ts` 增加坡道（`gates.ascent`）与高地平台，`walkableRegions` 按三个关口组合缓存。遮挡圆柱支持底部高度，跟随镜头不低于地面 0.5 m，结局时后拉并抬向树冠。`world/zones/Highland.tsx` 渲染古树（`onBeforeCompile` 补丁：按高度分段点亮、从 BaseColor 抠出光纹、程序化流动光线、树冠辉光）和实例化岩石。`features/route` 扩展为三个区域，节点分灯笼柱（post）与灯座（cradle），由同一个 `Lanterns.tsx` 按种类渲染；`GateMist` 参数化后用于走廊与坡道两处。`guide.ts`（字幕文案、按区域选择下一个目标）、`save.ts`（序列化/校验/恢复、localStorage 读写、继续时的出生点）、`HintPulse.tsx`（停滞提示光柱）由 `RouteDirector` 驱动；`audio/music.ts` 给出声部数与和声，`engine.ts` 用前瞻调度器排音。低频 UI 状态（字幕、结局卡）存放在 Zustand store。

场景升级（2026-11-12）：`world/scale.ts` 的 `WORLD_SCALE` 统一放大区域、林径、水塘、花与关口（资产尺寸、角色可达距离和林径宽度不放大）；地形加入 `rolling()` 起伏，`rollWeight()` 在湿地、空地和木屋、古树处为 0。`rendering/scatterChunks.ts` + `Scatter.tsx` 是通用的分块实例化：每个约 20–32 m 的块是一个带包围球的 InstancedMesh，整块视锥剔除，按块到相机的距离切换 LOD 或隐藏；树木、地表植被与配景都用它。`rendering/grassField.ts` 把地面高度和草密度烘焙成浮点纹理，`Grass.tsx` 用一组跟随相机平铺换位的实例化草片绘制（数量随画质）。`rendering/AirEffects.tsx` 是光束与低雾（各一次绘制）。`world/zones/sceneryLayout.ts` 生成全部布景并导出碰撞（倒木、栅栏为盒体，大苔石为圆）、草地避让区和木桥桥面高度 `deckHeight()`；`Player` 取地面与桥面中较高者为脚下高度，`Water` 按角色实际脚下高度判断是否涉水。

视觉升级（2026-11-12）：`rendering/PostFX.tsx` 用 Three.js 自带的 EffectComposer（4× MSAA 半浮点目标）→ UnrealBloom → OutputPass（色调映射与 sRGB）→ 调色 ShaderPass；它以优先级 1 的 useFrame 接管渲染，并手动清零 `gl.info`，使调试统计覆盖整帧（含阴影与后期）。天空着色器加入太阳光盘与光晕，`atmosphere.sunDirection` 供草地等读取；`Atmosphere` 另有一盏跟随相机的补光，太阳阴影覆盖 ±40 m（高画质 4096²）。`Grass.tsx` 改用 `MeshLambertMaterial` + `onBeforeCompile`（受光、接收阴影、雾），背面不翻转法线；踩踏用 8 个足迹点（玩家当前位置 + 最近脚印，衰减约 1.8 s）把草推开压低。`soundscape.footstep()` 按地面（草、土路、木桥）合成空间脚步声；`wetlandLayout.wading()` 以“脚低于水面且脚下是水塘或水渠”判断涉水（地形起伏后，营地低洼处也可能低于水面，但不算水里）。

灯光与森林（2026-11-12）：`rendering/LocalLights.tsx` 持有固定数量的点光源（按画质 2–4 盏，`config.localLights`），灯笼、灯座与花把自己登记为 `lightSources` 并每帧写入亮度；按到镜头的距离加权选出最近的几个，换源时先淡出再淡入，远处按距离淡出，因此光源总数不变、不重编译、不跳变。`forestLayout.ts` 的树木布局改为：`standDensity()`（低频噪声）决定密林与空地，各树种按密度取不同的扎根概率（幼树偏向林缘与林径旁），大红杉带出一圈子树，`sentinels()` 沿林径不规则地放大树；数量常量现在是上限，用固定尝试次数，使空地不会被补满。幼树之间允许较小间距（`THICKET_GAP` 1.4 m），其他树之间仍保留 2.6 m 可通行间隙。

`rendering/Precompile.tsx` 在场景挂载后预编译全部材质（包括隐藏的萤火流、光桥和光柱），避免着色器在游玩中途首次编译造成卡顿。

每帧通过共享可变向量和 R3F 帧循环协调，不逐帧 setState；时间步长有限制。指针锁状态和暂停是低频事件才写入 store。设置使用 localStorage，进度存档尚未实现。

测试分两层：Vitest 覆盖纯函数（`src/**/*.test.ts`）；Playwright（`e2e/*.e2e.ts`）对生产构建做浏览器交互与性能基线，通过 `?debug` 钩子读取状态和摆放场景。

## 计划
按实际功能增设模块，不提前创建空壳：`features/flora`（发光植物、唤醒光波）、`features/firefly`（萤火粒子）、`features/route`（萤火航线）、`audio`（Web Audio 实时合成的环境声与空间音符，单例引擎 + 场景内 `SoundscapeDriver` 桥接设置与帧循环）、`shared` 已存在；新区域沿用区域并集、高度场与航线节点扩展；存档格式带版本号，布局改变时旧存档被忽略。碰撞与遮挡继续使用代码维护的代理体，不对渲染网格做逐帧射线检测。四种模型目前经 drei `useGLTF` 加载，树木已有实例化和 LOD；按区域加载与释放、纹理及网格压缩仍需随真实资源制定。Low/Medium/High 将扩展为经测量的完整渲染预算。部署使用 Vite 相对 base 与静态文件，无后端。
