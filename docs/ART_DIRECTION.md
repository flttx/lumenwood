# 美术方向

2026-11-15 白天视觉收敛（已实现，待用户复玩）：采用浅金日光、鲜活叶绿和偏冷的林下阴影，减少灰黄雾幕，与暮光的蓝紫环境和暖金灯火形成区别。本轮收敛现有呈现，下方已确认的 Master Prompt 不变，不增加生成授权。

- 光色：日光调向乳白暖色，太阳高度约 33°；天空与远雾偏清透蓝绿，减少补光以保留林冠明暗。白天开局褪色强度由 0.55 降为 0.22，仍保留唤醒后的复色差异；暮光/夜晚端点配色沿用原值。
- 植物：草地按时段混合深绿根部、嫩绿叶尖与少量枯色；已有植被的绿色像素增加白天叶绿倾向，树皮保留底图。减弱草尖发金、日间低雾和泛光，几何光束更细、有断续明暗。透叶仍是材质近似，光束沿用几何/屏幕空间效果，不称为完整体积光模拟。
- 谜题景观：沟壑改为不规则弧形内外岸线与较宽坡面；0.25 m 局部地形替换相同区域粗网格，不叠面。岩坡采用泥土/石质色，已有苔石、岩石、蕨类、野花构成岸边层次，避开桥口、光路和奖励。
- 藤桥：临时根系增加弯曲与不等间距横枝，沿边复用 Meshy 蕨类补枝叶。岸坡石块按脚印范围内最低地面落座、补接触阴影；碰撞跟随同一岸缘函数。

岸坡仍为高度场，镜盘/支架/根系仍为临时几何；树冠淡出的颗粒、部分密林角度的遮挡和远景简化仍有限制。实际验证见 PROGRESS.md，正式美术与用户体验验收待复玩。

2026-11-14 范围说明：白天[借光生长样板](DAYLIGHT_SAMPLE.md)的日光镜镜盘/支架、藤桥采用明确标注的临时几何；干沟壑为样板承载地形。镜座、植物、蕨类和岩石复用本工程已登记的 Meshy 资产，光束为程序化效果。当前形态不代表正式美术验收，也不增加资产生成授权。

版本：Lumenwood Master Art Style Prompt v1（2026-11-09 用户确认）。本文是所有正式可见资产的风格依据；修改风格须经用户确认并升版本号，不得在单个资产中私自引入新风格。

## 已实现
本文规范已确立。首批四种资产（CHR-001、VEG-001、INT-001、ARC-001）已按本规范生成并集成，见 `docs/ASSET_MANIFEST.md`。地面、光照和雾仍是灰盒设置，不代表正式视觉。

## 1. 全局视觉风格

**风格定位**：高级风格化魔法森林奇幻，电影感的高品质 3D 独立游戏美术。世界温暖、神秘、宁静、沉浸，真正有生命感。

| 维度 | 要求 |
| --- | --- |
| 视觉语言 | 柔和但轮廓清晰的有机剪影，优雅的风格化比例，精心雕刻的形体，适度几何简化，整体统一，环境层次丰富，形状高度可读。 |
| 材质 | 温暖木质、自然雕刻的树皮、柔软苔藓、丰富枝叶、风化自然石、手工织物、精致植物细节。高品质风格化 PBR，表面细节克制，粗糙度有细微变化，色彩协调。 |
| 色板 | 苔藓绿、深林绿、蜂蜜棕、树皮棕、奶油色、柔和琥珀金、克制的暮光蓝。饱和度丰富但受控，避免过亮。 |
| 光照与氛围 | 白天：温暖金色阳光穿过多层林冠。黄昏：柔和蓝色环境光与琥珀灯笼、发光花、发光蘑菇、萤火虫交融。电影化布光、空气纵深、薄雾、自然阴影过渡、经过构图的冷暖对比。 |
| 世界设计 | 茂密但可通行的魔法森林、蜿蜒林径、舒适木构建筑、覆苔岩石、溪流、古树、秘密空地与生态细节。每个地标有易记剪影，并与周边森林有可信联系。 |
| 情绪 | 惊奇、宁静、好奇、发现、静谧的魔法感；亲切且令人难忘，而不幼稚、不过度装饰。 |
| 游戏美术要求 | 面向精致的第三人称 3D 探索游戏：保持剪影可读、世界比例一致、材质可复用、几何高效，在常规游戏镜头距离下有强视觉品质。 |
| 品质目标 | 高级、电影感、统一、精致的风格化 3D 游戏美术，材质与环境氛围出众。 |

区域情绪沿用既有规划：林间营地偏温暖，萤光湿地偏冷柔，古树高地强调尺度与光束。

### 1.1 Master Prompt（生成用原文，勿改写）

```text
Premium Stylized Magical Forest Fantasy, cinematic high-end 3D indie game aesthetic.
A breathtaking, enchanting woodland world with handcrafted, premium stylized 3D art direction. The environment feels warm, mysterious, peaceful, immersive, and genuinely alive.
Visual Language: Soft but clearly defined organic silhouettes, elegant stylized proportions, carefully sculpted forms, subtle geometric simplification, cohesive art direction, rich environmental depth, and highly readable shapes.
Materials: Tactile warm wood, naturally sculpted tree bark, soft moss, rich foliage, weathered natural stone, handcrafted fabric, and delicate botanical details. High-quality stylized PBR materials with restrained surface detail, subtle roughness variation, and sophisticated color harmony.
Color Palette: Muted moss green, deep forest green, warm honey brown, natural bark brown, cream, soft amber gold, and restrained twilight blue. Rich but controlled saturation, avoiding excessive brightness.
Lighting & Atmosphere: Warm golden sunlight filtering through layered forest canopies during daytime. At twilight, soft blue ambient light blends with warm amber lanterns, luminous flowers, glowing mushrooms, and gentle fireflies. Cinematic lighting, atmospheric depth, soft mist, natural shadow transitions, and carefully composed warm-cool contrast.
World Design: Dense but navigable magical forests, winding woodland paths, cozy wooden structures, moss-covered rocks, streams, ancient trees, secret clearings, and ecological details. Every landmark should have a memorable silhouette and a believable connection to the surrounding forest.
Emotional Direction: Wonder, serenity, curiosity, discovery, and a quiet sense of magic. The world should feel inviting and emotionally memorable rather than childish or overly decorative.
Game Art Requirements: Designed for a polished third-person 3D exploration game. Preserve silhouette readability, consistent world scale, reusable materials, efficient geometry, and strong visual quality from normal gameplay camera distances.
Quality Target: Premium, cinematic, cohesive, polished stylized 3D game art with exceptional material quality and environmental atmosphere.
```

光照与氛围段落约束的是游戏内渲染与场景搭建，不应烘焙进单个资产的贴图（见第 2 节）。

## 1.2 场景尺度与氛围（2026-11-12 场景升级）
- 以设计图为准：高大的红杉与冷杉（18–30 m）构成层叠林冠，角色在树下显得渺小；林下有蕨类、草、苔石、倒木、蘑菇，湿地有芦苇与低雾，林径与空地上方有斜射的光束。
- **草地例外**：经用户 2026-11-12 同意，成片草地由代码生成（着色器草片，只在相机附近绘制），视为地形细节；轮廓明显的植被与配景仍按 Meshy 流程制作。光束、低雾、萤火、光晕同属代码效果。

## 1.3 光影与调色（2026-11-12 视觉升级）
- 用户明确光影是本项目的核心卖点。“白天”改为金色午后：太阳低（约 24°），位于北方，沿主路北行时逆光；长树影投向玩家，林间有光柱与暖色薄雾，天空从晴蓝过渡到桃金色地平线，太阳有光盘与光晕。“暮光”是冷蓝林地加北方的橙粉余晖。
- 画面经后期：HDR 渲染，亮处（太阳、发光植物、灯笼、萤火）柔和泛光，色调映射后做冷暗部、暖亮部的分离调色，再加对比、饱和与暗角，参数随时段变化（`rendering/timeOfDay.ts` 与 `PostFX.tsx`）。泛光以柔和为准，避免 Negative Prompt 中的 exaggerated bloom。
- 一盏跟随相机的弱补光（不投影）保证逆光下角色与近景仍有体积；草地接收树影形成光斑，逆光时草尖透亮。
- 灯光（2026-11-12 改进）：点亮的灯笼、灯座与暮光下的花是真实光源，暖光照到起伏的地面、草、树干和角色，随距离自然衰减；不再使用贴地的平面光池。空中只保留很淡的光晕，辉光主要靠泛光。发光蘑菇与花在暮光下的自发光已调低，避免泛光后糊成白团。
- 场景丰富（2026-11-12）：针叶林之外加入白桦（林缘与空地边的浅色树干、透光树冠）、开花灌木、野花丛与苔藓树桩，营地加篝火、木箱木桶、柴堆与林径路标；生命感来自代码表现的飘叶、阳光中的尘埃、白天的蝴蝶与湿地蜻蜓，以及会跳开的野兔和掠过空地的鸟群。篝火的火焰、火星与烟由代码生成，并作为真实光源照亮营地。
- 森林结构（2026-11-12 布局第二版）：避免人工林般的均匀撒点。低频噪声把林地分成密林与开阔的林间空地；红杉以一棵大树为中心成环生长；幼树聚在林缘和林径旁有光的地方；林径两侧不规则地立着高大树干，像设计图那样夹住小路。

## 1.4 界面与视觉对齐（2026-11-12）
- 界面按设计图（`concept-art/01`、`02`）统一为一套：深林墨色底、暖金（#f3cf8c 到 #b97a34 的渐变）标题与描边、叶形标记、半透明玻璃面板。标题用衬线字体：中文 Noto Serif SC（SemiBold），英文 Cormorant Garamond（含斜体），均为 SIL OFL 1.1；仓库只存子集化后的 WOFF2（`src/assets/fonts/`，中文子集约 48 KB，只含界面与字幕用到的字），许可文本在同目录，子集由 `scripts/fonts/subset.py` 生成。正文仍用系统黑体。
- 首页背景是游戏内实时渲染的截图（暮光营地、提灯的角色走向木屋与篝火，1920×1080 JPEG，`src/assets/ui/keyart.jpg`），不是生成图；视觉改动后应重拍。首页、加载、暂停、结局四个画面共用这张图或游戏画面本身，并叠加 CSS 飘萤。
- 暮光调色改为设计图的蓝紫夜色配暖金灯光：天顶偏紫、雾偏蓝紫、暗部提亮并偏紫、亮部偏暖金，饱和略升；太阳光盘在暮光中减弱，避免地平线附近泛光成片。天空加入代码生成的云带（太阳一侧有暖色边光）、两层远山剪影和暮光星点。
- 主角提着 PRP-008 手提灯笼（设计图里的标志形象），暮光下是一盏暖色实时光源，光源略外移，避免把角色的腿照到过曝。可唤醒的花改为 INT-004 发光百合（粉紫大花、金色花心），比原先的小铃铛花在第三人称镜头下更容易认出。
- 古树的光纹调柔（亮度约减半、线条更宽更淡），点亮的树冠里出现缓慢闪烁的暖色光球，结局时更亮。
- 电影质感（2026-11-12 第二轮）：高画质加入环境光遮蔽，树根、石头、桥墩与地面相接处有柔和的接触阴影；调色加细微的动态胶片颗粒与画面边缘的轻微色散。模型落地以“根盘下最低的地面”为准，斜坡上上坡一侧埋进土里，而不是下坡一侧悬空。
- 湿地小桥（ARC-002 第 3 版）是苔藓石拱桥：木板桥面、两侧实心矮石栏、四角带灯石柱（第 2 版木栏杆桥从桥头看严重变形，已弃用）；光桥是代码生成的发光拱桥：半透明的光之木板、两侧光带扶手、水中淡淡的倒影与上升的光点，由萤火从南岸向北岸逐段铺成。

## 1.5 质感收敛（2026-11-14，已实现，待用户复玩）

- 不改变 Master Prompt 的视觉风格。代码草地改为细长、尖端收零、带弯曲的小簇，保留受光、阴影和踩踏；相同草片预算集中到近景。地面通过着色补充泥土、苔藓、小落叶和轻微起伏，陡面不画落叶；这些是地形细节，没有增加正式 3D 道具。
- 泛光回到光源周围，减少火焰、花瓣、蘑菇与古树失去底色的现象；取消可见红青色散，胶片颗粒减弱。篝火透明合成、灯光晕缩小；古树树冠保留叶色、光纹更克制，地标光柱近处渐淡。
- 树冠中距离可触发镜头拉近，近叶在相机和角色视线附近淡出；抬头范围扩大，便于看地标。像素淡出和近似树冠代理仍有可见局限，未视为所有角度已验收。
- 海水使用连续深度渐变与不整齐的向岸浪带，瀑布水丝增加短段破碎并降低白度。远海水平层次、瀑布岩壁体块仍待提高，不将效果数量等同于自然度。
- 首页 `src/assets/ui/keyart.jpg` 已于本轮用当前游戏重拍：1920×1080，JPEG 362,350 字节；完整复色的暮光营地测试存档、角色位于约 (30, −22) 后向木屋短走，镜头 yaw −0.38 / pitch 0.22，隐藏 HUD 后直接截图。素材来自本工程实景，未用生成服务、旧工程或外部图像资产，未产生生成成本。

## 1.6 三时段整体优化（2026-11-15，已实现，待用户复玩）

- 白天的叶绿、乳白暖日光和冷阴影保持；暮光改用偏中性的冷蓝环境配杏金余晖，夜晚用低饱和蓝灰月光，减少树皮、泥土和草地统一偏蓝紫。未复色区域的褪色上限由 0.55 降到 0.38，日间仍为 0.22。
- 降低普通蘑菇和巨菇的常态自发光，已唤醒巨菇仍有独立反馈；古树光点变稀、亮度下降。低雾减薄、边缘更软，并叠加缓慢流动的密度变化；不将透明雾片称为真实体积雾。
- 镜湖/湿地水面降低法线与倒影扰动，低画质补轻微水色变化；海面采用连续天空反射、较弱远处法线和较远的雾化过渡。瀑布承载陡面增加石色、噪声与断续层理，崖线有少量退让变化。海面远处仍有水平层次，岩壁仍偏平，低画质缺少镜面倒影；这轮不作为水体/崖壁正式美术验收。
- 演出按最终后拉和抬升后的完整镜头臂检查树干/树冠，小型植被补相机淡出。古树演出检查点仍有侧方树木和近景蕨类，未保证所有角度均无遮挡；保持玩家控制水平视角。
- 高地新增光脉是程序化细光束，灯座继续用现有 INT-003；没有新增正式模型、贴图或付费生成。日光镜盘/支架/藤桥根系继续标为临时美术。

同日第二次打磨（已实现，待复玩）：远海大面积反射使用柔和天空混合，扰动法线主要影响局部波光，减少低视角的平行明暗纹；修复海水被跳过接触阴影计算后，水下地形接缝在海面形成矩形暗斑的问题。瀑布外侧承载地形改为不规则退台，0.5 m 局部网格替换原网格，瀑布本身的支撑与可行走岸边保持；岩面用低对比裂隙/风化色替代整墙横线，投影坐标分开以消除坡顶密纹。草地排除岩面并阻止高度场在陡单元中插出悬草。古树入口预留低植被视线通道，保留两侧森林和苔石。近看岩面仍是程序化承载材质，海面也不是物理反射/折射；低画质镜湖、正式镜桥资产和所有角度构图仍待后续。

## 2. 单资产建模要求

以下是把全局要求落到单个 Meshy 资产时的技术约束，不引入新的风格元素。

- **单体与背景**：参考图与生成结果只含一个资产，居中，中性浅灰背景，无地面、场景、文字、水印或额外道具。
- **剪影可读**：以游戏镜头为准（相机距角色约 6.5 m，最近 1.2 m）。主要形体在该距离可辨，细节服从“克制的表面细节”，不堆砌微细节。
- **材质**：风格化 PBR，至少有 BaseColor、Normal，以及 Roughness/Metallic/AO（打包为 ORM）。贴图不烘焙方向光、投影或环境光遮蔽以外的光照；发光部位单独输出 Emissive，发光强度和动画由代码控制。
- **几何**：闭合、无漂浮碎片与反面，面数在清单预算内，可在 Blender 中减面或重拓扑；同类资产尽量共用材质。
- **坐标约定**（与现有代码一致）：Y 轴向上，单位为米，原点位于底部中心；角色与有朝向的资产正面朝 +Z（`Player.tsx` 的朝向计算以 +Z 为前）。
- **比例**：遵循“世界比例一致”。灰盒参考尺寸：角色碰撞半径 0.35 m、镜头注视高度 1.25 m；针叶树灰盒树干底半径 0.4 m、树高 4.8 m（均乘以 0.8–1.28 的缩放）。正式尺寸在首批验证中确定，见资产清单。
- **碰撞与交互**：碰撞代理、遮挡代理与程序化粒子由代码实现，模型不承担碰撞。

单资产提示词结构（只替换方括号内容）：

```text
[资产的具体描述：形体、材质、配色，均取自 Master Prompt 的材质与色板], single isolated game asset, centered, neutral light gray background, no ground, no scene, no text,
premium stylized magical forest fantasy, soft but clearly defined organic silhouette, carefully sculpted forms, restrained surface detail, high-quality stylized PBR materials, readable from a third-person gameplay camera distance.
```

## 3. 角色规范：松果拾光者（CHR-001）

### 3.1 权威参考
已确认的 A 方案参考图是本角色唯一的造型依据，存于 `assets/reference/CHR-001-pinecone-gleaner/`（PNG 不纳入版本管理，README 记录校验值）：

| 文件 | 视角 | 尺寸 |
| --- | --- | --- |
| `a-front.png` | 正面 | 1024×1536 |
| `a-profile-facing-right.png` | 侧面（面朝画面右侧） | 1024×1536 |
| `a-profile-facing-left.png` | 侧面（面朝画面左侧，略带 3/4） | 1024×1536 |

用户称之为“四视图”，但当初只收到以上三张。2026-11-10 以 `a-front.png` 为输入用 codex-cli 补出 `a-back.png`（背面），提示词见同目录 `back-prompt.md`。

### 3.2 造型要点（据参考图归纳）
- **头部**：松果鳞片构成的尖顶兜帽，帽尖向后卷曲；帽檐和脸周围是一圈锯齿边的黄绿色叶片。
- **面部**：带细微木纹的暖色木质肤感，大而亮的琥珀色眼睛，浅浅的微笑，脸颊有雀斑和红晕；浅棕色短发，额前一缕叶形刘海，耳尖微尖。
- **上身**：多层锯齿叶片组成的短披肩，领口用橡果状扣子固定，下垂一根短绳；内搭奶油色泡泡袖衬衫和皮质背带。
- **腰部**：棕色皮带配铜扣；一侧有小皮袋，另一侧挂铜环。
- **下身**：叶片前后摆覆在蓬松的棕色及膝灯笼裤上；橄榄绿针织长袜，膝盖处贴叶形补丁，并绑交叉皮绳。
- **手脚**：腕部是带黄色叶片徽记的皮护腕；缝线棕色皮靴，靴口翻出一圈叶片。
- **姿势**：A 字姿势，双臂下垂约 45°，手指自然张开，适合自动绑骨。

### 3.3 已知不一致（2026-11-10 已处理）
- **配件左右**：正视图中皮袋在角色右胯、铜环在左侧；两张侧视图相反（面朝右的那张能看到铜环，面朝左的那张能看到皮袋）。多图生成时左右冲突会导致配件重复或缺失。处理：以正视图为准（用户授权后续资产无需逐项确认后由 Claude 按本建议决定）；生成只用正、背两张，侧视图不作为输入。
- **背面缺失**：已补背视图——兜帽松果鳞片覆盖到后颈，披肩两层叶片盖住肩背，背带在背后交叉；皮袋与铜环左右与正视图一致。

### 3.4 角色技术要求
- 保持参考图比例与造型，不改成写实比例，也不进一步 Q 版化。
- 兜帽、披肩叶片、前后摆都是独立凸出的层，需要检查与身体的穿插，以及绑骨后的蒙皮变形。
- 骨架与动画（idle / walk / run）按 `docs/ANIMATION_PIPELINE.md` 执行；绑骨来源（Meshy 自动绑骨或 Mixamo）在生成时核实许可后登记。
- 当前 Meshy 绑骨高度参数为 1.6 m；镜头与碰撞参数仍需结合游戏内视觉验收，调整尺寸时应同步验证。

## 4. Negative Prompt（生成用原文）

```text
Photorealistic photography, hyperrealistic human anatomy, childish cartoon proportions, excessively cute toy aesthetics, flat mobile-game graphics, Minecraft, voxel art, blocky geometry, overly simplistic low-poly assets, anime cel shading, plastic-looking surfaces, oversaturated candy colors, excessive neon, cyberpunk, grimdark horror, gothic architecture, cluttered micro-details, inconsistent scale, mismatched art styles, exaggerated bloom, muddy textures, noisy materials, blurry silhouettes, poor topology, distorted anatomy, unnecessary accessories.
```

适用说明：
- 所有资产默认附带完整 Negative Prompt。
- 角色以 3.1 的已确认参考图为准。若 “childish cartoon proportions”“excessively cute toy aesthetics” 与参考图的头身比、大眼造型冲突，按“不得比参考图更夸张”理解，不能据此改变已确认的造型。
- “unnecessary accessories” 不包括参考图中已有的配件（皮袋、铜环、护腕、扣子）。
