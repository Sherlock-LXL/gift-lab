# 礼物偏好研究所

手机优先的 React + Vite + TypeScript 小游戏。玩家依次完成快乐雷达、24 件礼物评分、30 组二选一，并解锁固定剧情的幸运礼物大转盘。

## 隐私边界

- 无登录、无后端，不自动上传任何回答。
- 答题和奖励进度只保存在浏览器 `localStorage`。
- 玩家可自主下载或分享 JSON。
- 本仓库不包含任何真实玩家数据、聊天记录、截图、密钥或旧项目 Git 历史。

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
