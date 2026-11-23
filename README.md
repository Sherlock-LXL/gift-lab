# 礼物偏好研究所 · Gift Preference Lab

[中文](#中文) · [English](#english) · [在线体验](https://sherlock-lxl.github.io/gift-lab/)

## 中文

手机优先的 React、Vite、TypeScript 小游戏：完成快乐雷达、24 件礼物评分和 30 组二选一，或解锁本地礼物喜好预测。

### 主要功能

- 答题进度保存在浏览器 `localStorage`，可自主下载或分享 JSON。
- 六位密码解锁预测页；七项 0–10 分评分（步长 0.5）与七类 one-hot 输入，经归一化后送入原 `14 → 8 ReLU → 1` 模型。
- 线性输出仅在显示时裁剪到 0–10 分，与原 Python 应用一致。
- 预测输入与结果不保存；退出、切到后台或刷新后重新锁定。

### 运行

需要 Node.js 22.12+：

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

推送 `main` 或手动运行 [部署工作流](.github/workflows/deploy.yml)，依次检查题库可复现性、运行测试、构建并部署 GitHub Pages。生产基路径为 `/gift-lab/`。

### 模型与数据

无登录或后端，回答不自动上传。原 `final_model.npz` 仅以 AES-GCM 加密权重发布，训练数据与明文权重不随网站提供。六位前端密码提供轻量保护，存在离线猜测可能。

更新权重时，在含 NumPy 与 Node.js 的环境运行：

```bash
python scripts/pack-predictor.py /absolute/path/to/models/final_model.npz
```

脚本隐藏读取密码，仅更新 `src/predictor/model.vault.json`。

## English

A mobile-first React, Vite and TypeScript game with a happiness radar, ratings for 24 gifts, 30 pairwise choices, and a local gift preference predictor.

### Features

- Progress stays in browser `localStorage`; players can export or share JSON.
- A six-digit passcode unlocks the original `14 → 8 ReLU → 1` model. Seven 0–10 ratings, in 0.5 increments, are normalized and combined with seven one-hot categories.
- The linear output is clipped to 0–10 only for display, matching the original Python application.
- Predictor inputs and results are not saved. Leaving, backgrounding or refreshing locks the page.

### Run

Requires Node.js 22.12+:

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Push to `main` or run the [deployment workflow](.github/workflows/deploy.yml) to verify the reproducible question bank, test, build and deploy GitHub Pages. The production base path is `/gift-lab/`.

### Model and data

There is no login or backend, and answers are not uploaded automatically. Only AES-GCM encrypted weights from the original `final_model.npz` are published; training data and plaintext weights are excluded. The six-digit frontend passcode provides lightweight protection and permits offline guessing.

To update weights in an environment with NumPy and Node.js:

```bash
python scripts/pack-predictor.py /absolute/path/to/models/final_model.npz
```

The script reads the passcode without echo and updates only `src/predictor/model.vault.json`.
