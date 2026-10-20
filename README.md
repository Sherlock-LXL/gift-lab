# 礼物偏好研究所

手机优先的 React + Vite + TypeScript 小游戏。玩家可以完成快乐雷达、24 件礼物评分和 30 组二选一，也可以通过密码进入本地运行的礼物喜好预测页。

## 隐私边界

- 无登录、无后端，不自动上传任何回答。
- 答题和奖励进度只保存在浏览器 `localStorage`。
- 玩家可自主下载或分享 JSON。
- 本仓库不包含任何真实玩家数据、聊天记录、截图、密钥或旧项目 Git 历史。
- 预测模型来自项目作者提供的 `final_model.npz`，只发布 AES-GCM 加密后的权重，不发布训练数据或明文权重。

## 礼物喜好预测

首页的「礼物喜好预测」入口需要六位数字密码。解锁后，浏览器在本机执行原模型的 `14 → 8 ReLU → 1` 前向传播：

- 七项 0–10 分滑块先除以 10，步长为 0.5 分。
- 七种礼物类型转换为固定顺序的 one-hot 输入。
- 线性输出只在显示时裁剪到 0–10 分，与原 Python `app.py` 一致。
- 预测输入和结果不写入答题 JSON、`localStorage` 或任何网络服务；退出、切到后台或刷新会重新锁定。

这是纯静态站点上的轻量隐私保护，不等同于服务端身份认证。加密文件、解密代码和 PBKDF2 参数都需要随网页发布，因此具有足够时间和技术能力的人仍可能离线尝试六位密码。需要严格访问控制时，应把模型迁移到带身份认证的后端，不能只依赖前端密码。

更新模型时，不要复制训练数据或明文 `.npz` 到本仓库。使用原模型项目的 Python 环境运行：

```bash
python scripts/pack-predictor.py /absolute/path/to/models/final_model.npz
```

脚本会隐藏读取六位密码，并只更新 `src/predictor/model.vault.json`。

## 本地开发

需要 Node.js 22.12 或更高版本：

```bash
npm ci
npm run dev
```

默认生产基路径为 `/gift-lab/`。本地检查生产构建：

```bash
npm test
npm run build
npm run preview
```

## GitHub Pages 部署

[部署工作流](.github/workflows/deploy.yml)在以下情况运行：

- 推送到 `main`
- 在 GitHub Actions 页面手动运行

工作流在 Ubuntu Runner 上依次执行锁定依赖安装、题库可复现检查、单元测试和 Vite 生产构建，然后将 `dist/` 发布到 GitHub Pages。Vite 基路径固定为 `/gift-lab/`。

首次部署时，仓库所有者需要在 GitHub 打开：

`Settings → Pages → Build and deployment → Source → GitHub Actions`

后续更新只需向 `main` 推送提交：

```bash
git add .
git commit -m "Update site"
git push origin main
```

线上地址：<https://sherlock-lxl.github.io/gift-lab/>
