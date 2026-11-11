# 工程架构

## 已实现
`app` 管理入口和 Canvas，`world/zones` 组装灰盒，`world/zones/forestLayout.ts` 是树木布局的唯一数据源（渲染、碰撞圆、遮挡圆柱）；`Forest.tsx` 加载 VEG-001 GLB，用两个 InstancedMesh 按距离分 LOD（`treeLod.ts`），碰撞与遮挡仍用代码代理，不对渲染网格做射线检测。`world/zones/campLayout.ts` 定义木屋（`Cabin.tsx`，ARC-001）的位置、旋转盒体碰撞与圆柱遮挡代理，以及发光植物位置；`features/flora/GlowFlowers.tsx` 加载 INT-001，按与玩家的距离在帧循环里直接改材质发光强度（`glow.ts`）。`input` 维护非 React 高频输入，`input/focus.ts` 处理失焦、隐藏标签页、指针锁丢失的自动暂停。`player` 用纯函数 `movement.ts`（速度平滑、角度插值、边界）和 `collision.ts`（圆形推出、旋转盒体推出）更新共享的位置/速度向量，`Character.tsx` 加载 CHR-001 并按 `gait.ts` 选择动作；`camera` 在角色更新后跟随，`camera/occlusion.ts` 计算射线与竖直圆柱的最近交点。`rendering` 提供像素比档位，`assets` 提供模型根路径，`ui` 显示界面，`state` 用 Zustand 管理低频状态（阶段、指针锁、设置）。`debug/debugApi.ts` 仅在开发模式或 `?debug` 下暴露测试钩子。

P3 起：`world/regions.ts` 用矩形并集（营地、北侧走廊、湿地）定义可行走区域，`clampToRegions` 取代原来的方形边界，`gates` 是帧循环拥有的关口状态（走廊关闭时不计入可行走区）；地形起伏与远景树按到区域并集的距离生成，天空球跟随相机。`features/route` 实现萤火航线：`routeLayout.ts`（灯笼位置、朝向、碰撞圆、各区域终点）、`progress.ts`（纯函数规则：放出萤火、点灯、区域完成、关口计时，以及只在游玩时推进的 `routeClock`）、`flock.ts`（跟随角色与飞向灯笼的萤火模拟），`RouteDirector.tsx` 每帧应用规则并播放和弦，`Lanterns.tsx`（INT-002）、`RouteParticles.tsx`（引路萤火与萤火流的点精灵）和 `GateMist.tsx`（单次绘制的实例化迷雾）负责表现。`shared/` 放跨模块的纯工具（确定性随机数、smoothstep）。

每帧通过共享可变向量和 R3F 帧循环协调，不逐帧 setState；时间步长有限制。指针锁状态和暂停是低频事件才写入 store。设置使用 localStorage，进度存档尚未实现。

测试分两层：Vitest 覆盖纯函数（`src/**/*.test.ts`）；Playwright（`e2e/*.e2e.ts`）对生产构建做浏览器交互与性能基线，通过 `?debug` 钩子读取状态和摆放场景。

## 计划
按实际功能增设模块，不提前创建空壳：`features/flora`（发光植物、唤醒光波）、`features/firefly`（萤火粒子）、`features/route`（萤火航线）、`audio`（Web Audio 实时合成的环境声与空间音符，单例引擎 + 场景内 `SoundscapeDriver` 桥接设置与帧循环）、`shared` 已存在；湿地区域预计新增 `world/zones` 下的湿地布局与水面模块。碰撞与遮挡继续使用代码维护的代理体，不对渲染网格做逐帧射线检测。四种模型目前经 drei `useGLTF` 加载，树木已有实例化和 LOD；按区域加载与释放、纹理及网格压缩仍需随真实资源制定。Low/Medium/High 将扩展为经测量的完整渲染预算。部署使用 Vite 相对 base 与静态文件，无后端。
