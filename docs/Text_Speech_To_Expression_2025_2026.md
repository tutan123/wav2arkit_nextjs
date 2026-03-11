# 文生表情 / 语音生表情方案（2025–2026）

本文档汇总 **文本 → 表情** 与 **语音 → 表情** 的近期方案，以 2025、2026 年论文和开源项目为主，并标明输出形式（2D 视频 / 3D 系数 / Blendshape）及是否有代码。

---

## 一、语音 → 表情（Speech-driven 3D Facial Animation）

### 1. StreamingTalker（2025.11）⭐ 推荐关注

- **arXiv**: [2511.14223](https://arxiv.org/abs/2511.14223) — *StreamingTalker: Audio-driven 3D Facial Animation with Autoregressive Diffusion Model*
- **特点**：**流式、自回归扩散**，按音频流生成 3D 面部动画，支持变长音频、低延迟，适合实时场景。
- **输出**：3D 面部运动（具体是顶点/FLAME/Blendshape 需看论文与代码）。
- **代码**：论文中承诺开源，项目页 [zju3dv.github.io/StreamingTalker](https://zju3dv.github.io/StreamingTalker/)（请以实际发布为准）。

### 2. 解耦 Speech + Expression Blendshapes（2025.10）⭐ 与 52 ARKit 最接近

- **arXiv**: [2510.25234](https://arxiv.org/abs/2510.25234) — *Learning Disentangled Speech- and Expression-Driven Blendshapes for 3D Talking Face Animation*
- **特点**：**显式学习“口型驱动”与“情绪驱动”两套 Blendshape**，线性相加得到最终表情；可映射到 **FLAME** 的 expression + jaw，并用于驱动 3D Gaussian 化身。情绪表达强且保持口型同步。
- **输出**：Blendshape 系数 → 可再映射到 FLAME/其他 52 维标准（需自己做 Retargeting）。
- **数据**：VOCAset（中性说话）+ Florence4D（表情序列）。
- **代码**：论文未在摘要中给出链接，需在 CatalyzeX / Papers with Code 或作者主页查找。

### 3. PESTalk（2025.12）

- **arXiv**: [2512.05121](https://arxiv.org/abs/2512.05121) — *PESTalk: Speech-Driven 3D Facial Animation with Personalized Emotional Styles*
- **特点**：双流情绪提取（时域+频域）、基于声纹的个性化表情风格、3D-EmoStyle 数据集。
- **输出**：3D 面部动画（具体参数形式需看论文）。
- **代码**：暂未在检索中看到官方 GitHub，可关注作者或会议页面。

### 4. EditEmoTalk（2026.01）

- **arXiv**: [2601.10000](https://arxiv.org/abs/2601.10000) — *EditEmoTalk: Controllable Speech-Driven 3D Facial Animation with Continuous Expression Editing*
- **特点**：**连续情绪编辑**，不限于离散情绪标签；边界感知语义嵌入，在保持口型同步下平滑调节情绪。
- **输出**：3D 面部动画（可控情绪）。
- **代码**：需自行检索。

### 5. EmoTalkingGaussian（2025.02）

- **arXiv**: [2502.00654](https://arxiv.org/abs/2502.00654) — *EmoTalkingGaussian: Continuous Emotion-conditioned Talking Head Synthesis*
- **特点**：基于 **3D Gaussian Splatting**，用连续情绪（valence/arousal）控制表情，唇形与音频同步；支持 in-the-wild 音频。
- **输出**：3D Gaussian 说话头（非直接 52 ARKit，需额外管线才能转到 Blendshape）。
- **代码**：需在论文/作者页面查找。

### 6. EmoDiffTalk（CVPR 2026）

- **项目页**: [EmoDiffTalk](https://liuchang883.github.io/EmoDiffTalk/) — *Emotion-aware Diffusion for Editable 3D Gaussian Talking Head*
- **特点**：情绪感知扩散模型，可编辑的 3D Gaussian 说话头（CVPR 2026）。
- **输出**：3D Gaussian 说话头。
- **代码**：关注项目页或会议开源列表。

### 7. 已有开源、可接 3D/Blendshape 的语音驱动

| 项目 | 说明 | 输出 | 备注 |
|------|------|------|------|
| **EmoTalk** | [ZiqiaoPeng/EmoTalk](https://github.com/ZiqiaoPeng/EmoTalk) — Speech-Driven Emotional Disentanglement for 3D Face Animation | 3D 面部动画 / 系数 | 有代码，情绪解耦 |
| **EmoTalker** | [EmoTalker/EmoTalker](https://github.com/EmoTalker/EmoTalker) — 无参考帧、无情绪标签的说话头 | 3D 运动系数 → 视频 | 有代码 |
| **FaceTalk** | [FaceTalk (CVPR 2024)](https://github.com/shivangi-aneja/FaceTalk) — Audio-Driven Motion Diffusion for Neural Parametric Head | 参数化头部运动 | 扩散、有代码 |
| **SAiD** | [yunik1004/SAiD](https://github.com/yunik1004/SAiD) — Blendshape-based Audio-Driven with Diffusion | **32 维 ARKit 子集**（口/颌/颊/鼻，命名与 ARKit 一致） | 可与 52 维对接（缺的 20 维填 0），推理偏慢、偏离线 |

---

## 二、文本 → 表情（Text-driven Expression）

### 1. EC-TFG / TIE-TFG（2026.03）

- **arXiv**: [2603.06071](https://arxiv.org/abs/2603.06071) — *Text-Driven Emotionally Continuous Talking Face Generation*
- **特点**：输入**文本片段 + 情绪描述**，生成**情绪随文本连续变化**的说话脸视频（TIE-TFG：Temporal-Intensive Emotion Modulated）。
- **输出**：2D 说话脸视频（非直接 3D Blendshape）。
- **代码**：需检索作者/会议。

### 2. 人类偏好对齐的文本/信号 → 表情（2026.03）

- **arXiv**: [2603.07093](https://arxiv.org/abs/2603.07093) — *Facial Expression Generation Aligned with Human Preference for Natural Dyadic Interaction*
- **特点**：用 **Vision-Language-Action** 模型 + 人类反馈（RL），将说话者信号映射为 **3DMM 表示**，强调自然对话中的表情。
- **输出**：3DMM 参数（可再转为 Blendshape/FLAME）。
- **代码**：需检索。

### 3. FaceCLIP（2025）

- **文献**: Facial Expression Generation from Text with FaceCLIP (Journal of Computer Science and Technology 等).
- **特点**：基于 CLIP 的多阶段 GAN，从**文本描述**生成**高分辨率面部表情图像**；FET 数据集含“文本–表情”配对。
- **输出**：2D 表情图像（非 3D）。
- **用途**：适合做文本→表情的预训练或辅助数据。

### 4. SynFER（2024–2025）

- **arXiv**: [2410.09865](https://arxiv.org/abs/2410.09865) — 用文本 + 面部动作单元生成**合成表情数据**，用于提升表情识别等。
- **输出**：合成表情数据/图像，偏数据增强与识别，非直接驱动 3D 化身。

---

## 三、和“52 ARKit Blendshape”的对接方式

- **直接输出 52 ARKit**：目前开源里仍以 **Wav2ARKit / LAM_audio2exp** 为主（直接 52 维）；**SAiD** 输出 **32 维 ARKit 子集**（命名与 Apple ARKit 一致，缺眼/眉等约 20 维），按名称填到 52 维、其余填 0 即可对接。
- **输出 FLAME / 3DMM**：如 **2510.25234**、**EditEmoTalk**、**EmoTalk** 等，需要你做 **Retargeting**：FLAME/3DMM 系数 → 52 ARKit（或你当前用的 MetaHuman 52 维）。可用现成工具（如 FLAME-Universe、各 Blendshape 映射表）或自己训一个小映射网络。
- **输出 3D Gaussian / 2D 视频**：如 **StreamingTalker**、**EmoTalkingGaussian**、**EC-TFG**，若你要驱动现有 FBX/GLB 数字人，需要额外管线（例如从视频/3DGS 估计 Blendshape，或只作参考不直接驱动）。

---

## 四、简要选型建议

| 需求 | 可优先考虑 |
|------|------------|
| **语音 → 表情，要 52 ARKit 或 Blendshape，且能接现有 3D 管线** | 2510.25234（解耦 Blendshape）、SAiD、Wav2ARKit；FLAME 输出类需加 Retargeting。 |
| **语音 → 表情，强调实时、流式** | StreamingTalker（2511.14223），关注其开源代码与输出格式。 |
| **语音 → 表情，强调情绪与个性化** | PESTalk、EditEmoTalk、EmoTalk( GitHub )。 |
| **文本 → 表情（或文本+情绪）** | EC-TFG（2603.06071）、2603.07093（3DMM）；若只要 2D，FaceCLIP。 |

以上论文年份以 arXiv 提交时间为准（25xx/26xx 即 2025/2026）。代码与数据集请以各论文主页、GitHub、CatalyzeX、Papers with Code 最新信息为准。
