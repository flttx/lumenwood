# PRP-009 崖顶岩檐 · 参考图

2026-11-12 第三轮（画面、扩图与玩法）：用户授权 Meshy ≤ 150 积分（含参考图）。用 codex-cli 0.167.0 内置图像生成按 `prompt.md` 全文（Prompt + Negative，指令见 `instruction.txt`，日志 `codex.log`）一次生成四视图 `sheet.png`，用 PIL 按象限裁成 4 张并去掉多余背景，未做其他修改。原图（PNG）不纳入版本管理，可用下表的 SHA-256 校验。

| 文件 | 视角 | 尺寸 | 字节 | SHA-256 |
| --- | --- | --- | --- | --- |
| sheet.png | 2×2 四视图 | 1536×1024 | 1654984 | 8294f44801d39aa6b431ad8c362c49d7245a1af809af06c69ab2d264d141d766 |
| view-a.png | 3/4 前左，略俯视（裁自 sheet） | 756×428 | 370530 | eb1ae2d1dde18a7ed807f8e1c1005cd963d398b5b0ab5c1bc369416ac13af493 |
| view-b.png | 正立面（裁自 sheet） | 756×471 | 330276 | 3e781af3481d5a993794e8e3ccadfdde8c999e62adc9a21d7f36cffc5162e816 |
| view-c.png | 侧立面（裁自 sheet） | 362×340 | 158744 | 1105652953ab3ca7bc60c75d19d2ea6dc8315ec4504e46dc78ecc8f669309540 |
| view-d.png | 3/4 后右，略俯视（裁自 sheet） | 729×473 | 356132 | d51fe597388c3b96cc7711e7eb3e6e50ec28b7d8c6829de78a9fbf9108860066 |

检查：单一主体、浅灰背景、无文字水印。层叠的暖灰色岩板，顶面苔藓与两丛蕨，前缘中部有一道磨光的浅槽；四格一致，干燥无水。

权利：由 OpenAI 图像生成产出，使用权利以用户账号适用的现行 OpenAI 条款为准，待用户确认。
