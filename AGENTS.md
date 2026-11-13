# Lumenwood 工作规范

- 先阅读本文件、PROGRESS.md 和相关设计文档，核实当前状态；修改后更新验证记录。
- 本工程独立于 Aholo Forest Moments，禁止引用、复制或修改旧工程及其资产。例外（2026-11-13 用户授权）：可只读查看旧工程的实现以借鉴技法（如瀑布），但须自行重写代码，不复制代码、着色器文本或资产，并在 PROGRESS.md 记录借鉴了什么。
- 中文维护设计文档，代码命名用英文；区分已实现与计划。按模块划分职责，避免巨型组件和逐帧 React 状态更新。
- 正式可见 3D 资产使用 Meshy 制作，原始与优化资产分开，记录来源、许可和成本；地形承载、碰撞代理和程序化粒子可用代码。灰盒几何体明确标记为临时。
- 未经明确授权不得调用付费生成服务；禁止提交密钥、令牌和大型二进制测试资源。不要擅自扩展阶段范围。
- 使用 pnpm，保持静态部署能力；按变更执行类型检查、lint、测试和构建，不得虚报验证结果。

## 文档导航与维护

- [README.md](README.md) 是运行说明和文档导航入口；[PROGRESS.md](PROGRESS.md) 记录实际进度、验证结果、限制与下一步。[docs/ROADMAP.md](docs/ROADMAP.md) 记录现行阶段与验收目标。
- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) 汇总总体方案与待定事项；[docs/GAMEPLAY.md](docs/GAMEPLAY.md)、[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md) 和 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 分别说明玩法、美术与工程设计。按任务阅读相关文档，不能将计划或概念图视为已实现内容。
- 资产任务查阅 [docs/ASSET_MANIFEST.md](docs/ASSET_MANIFEST.md)、[docs/MESHY_PIPELINE.md](docs/MESHY_PIPELINE.md) 和必要时的 [docs/ANIMATION_PIPELINE.md](docs/ANIMATION_PIPELINE.md)；资产状态、来源、许可与成本应有据可查。
- 导入的 [总体方案与开发大纲](Lumenwood_总体方案与开发大纲_v1.md) 及概念图是设计来源，其中历史阶段编号和日期不等于当前路线图。发现文档、代码或台账不一致时应核实并记录，不凭文件存在认定功能或资产已通过验收。
- 状态或设计变化时同步更新受影响的文档与 README 导航；验证结果记录在 PROGRESS.md，只写实际执行的检查。
