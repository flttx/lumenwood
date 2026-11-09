# Lumenwood · 流光之森

独立第三人称森林探索游戏的灰盒原型（P1 探索手感）。需要 Node.js 22 和 pnpm；执行 `pnpm install`、`pnpm dev` 启动。点击开始后点击画面捕获鼠标，WASD 移动，Shift 奔跑，Esc 暂停或恢复；失焦或切换标签页会自动暂停。“继续探索”会尝试直接恢复鼠标捕获，被浏览器拒绝时再点击画面。`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 验证；`pnpm test:e2e` 构建后用本机 Chrome 运行浏览器交互测试与性能基线（结果在 `test-results/`，可用 `PW_CHANNEL` 切换浏览器）；URL 加 `?debug` 可启用测试钩子 `window.__lumenwood`。`pnpm preview` 预览构建。构建采用相对路径，适合静态托管。

画质目前仅控制像素比，音量设置尚未连接音频；设置保存于本地浏览器，尚无游戏进度存档。参见 [进度](PROGRESS.md) 和 [架构](docs/ARCHITECTURE.md)。
