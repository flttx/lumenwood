# 发现

- 本机已有 Playwright 浏览器缓存：`%LOCALAPPDATA%/ms-playwright/chromium-1243`、`chromium_headless_shell-1243`；另有 Chrome 157、Edge 157。
- 不是 git 仓库，无法用 git diff 核对，按文件直接核对。
- Forest 树木确定性生成：48 棵，`radius = 7 + (i%7)*2.5`，`scale = 0.8 + (i%4)*0.16`，树干底半径 0.4*scale。
- 相机距离 6.5、目标高度 1.25；pitch 范围 [-0.15, 0.9]。
- Playwright 1.65 需要 chromium-1254，与本机缓存 1243 不符；配置默认 channel=chrome 使用本机 Chrome 157，避免下载。
- headless Chrome 在本机走 ANGLE D3D11（RTX 5060 Ti）硬件渲染，帧率被 60Hz vsync 封顶。
- 未验证 Playwright 的 Escape 按键能否释放真实指针锁；失锁路径改用 document.exitPointerLock() 触发同一 pointerlockchange 事件。
- 树干阻挡 e2e 首版只校验距离，关碰撞后仍通过；已加“停在树前”断言。

## 资产阶段·首批生成（2026-11-09 查阅 Meshy 官方文档）
- Image to 3D：`POST https://api.meshy.ai/openapi/v1/image-to-3d`，Bearer 鉴权；`image_url` 支持 data URI（JPG/PNG/WebP，≤20 MB）。轮询 `GET /openapi/v1/image-to-3d/:id`，状态 PENDING/IN_PROGRESS/SUCCEEDED/FAILED/CANCELED；任务对象含 `consumed_credits`。
- 关键参数：`ai_model`（latest=meshy-7.1）、`should_texture`、`enable_pbr`、`texture_resolution`(2k/4k/8k)、`should_remesh`、`topology`(triangle/quad)、`target_polycount`(100–300000)、`save_pre_remeshed_model`、`pose_mode`(a-pose/t-pose)、`auto_size`+`origin_at`、`multi_view_thumbnails`、`target_formats`。`symmetry_mode` 已废弃。
- 价格（docs.meshy.ai/en/api/pricing）：Image to 3D meshy-7.1 仅网格 20、2K/4K 贴图 30、8K 35；meshy-6-lite/t2 为 5/15；2k/4k 几何分辨率 +5；Multi-Image to 3D 同价（meshy-7.1/6）；Rigging 5；Animation 每个动作 3；Remesh 5；Text to Image 3–9。失败任务退款；PENDING 删除可退款。
- 余额：`GET /openapi/v1/balance`，免费。速率：Pro 20 req/s、10 并发。
- 保留期：API 生成的模型最多保留 3 天，下载 URL 签名并在 `expires_at` 失效——生成后必须立即下载到本地。
- 许可（help.meshy.ai，第三方摘要，需以现行条款为准）：付费套餐输出归用户私有、可商用；免费套餐为 CC BY 4.0。API 创建任务本身需付费套餐（否则 402）。
