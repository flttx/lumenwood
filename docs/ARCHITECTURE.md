# 工程架构

## 已实现
`app` 管理入口和 Canvas，`world/zones` 组装灰盒，`world/zones/forestLayout.ts` 是树木布局的唯一数据源（渲染、碰撞圆、遮挡圆柱）；`Forest.tsx` 加载 VEG-001 GLB，用两个 InstancedMesh 按距离分 LOD（`treeLod.ts`），碰撞与遮挡仍用代码代理，不对渲染网格做射线检测。`input` 维护非 React 高频输入，`input/focus.ts` 处理失焦、隐藏标签页、指针锁丢失的自动暂停。`player` 用纯函数 `movement.ts`（速度平滑、角度插值、边界）和 `collision.ts`（圆形推出）更新共享的位置/速度向量；`camera` 在角色更新后跟随，`camera/occlusion.ts` 计算射线与竖直圆柱的最近交点。`rendering` 提供像素比档位，`assets` 提供模型根路径，`ui` 显示界面，`state` 用 Zustand 管理低频状态（阶段、指针锁、设置）。`debug/debugApi.ts` 仅在开发模式或 `?debug` 下暴露测试钩子。

每帧通过共享可变向量和 R3F 帧循环协调，不逐帧 setState；时间步长有限制。指针锁状态和暂停是低频事件才写入 store。设置使用 localStorage，进度存档尚未实现。

测试分两层：Vitest 覆盖纯函数（`src/**/*.test.ts`）；Playwright（`e2e/*.e2e.ts`）对生产构建做浏览器交互与性能基线，通过 `?debug` 钩子读取状态和摆放场景。

## 计划
按实际功能增设 `interaction`、`features/firefly`、`features/flora`、`audio`、`shared`，不提前创建空壳。正式模型引入后，碰撞与遮挡继续使用代码维护的代理体，不对渲染网格做逐帧射线检测。优化模型的加载、缓存与释放、按区域加载、实例化、LOD、纹理及网格压缩需要随真实资源制定；目前只有 VEG-001 一个模型，直接经 drei `useGLTF` 加载，无按区域加载与释放。Low/Medium/High 将扩展为经测量的完整渲染预算，音量对接 Web Audio。部署使用 Vite 相对 base 与静态文件，无后端。
