# Super Agent Console 公开文章系列

> 系列定位：记录一个 10 年前端在失业后重新部署自己的过程，从低成本云环境、K3S、Docker、CI/CD、配置密钥、日志采集，一步步走到 Nuxt3 AI Agent Console、Agent Runtime、Tool / Skill、真实模型接入和公网试用排障。

## 目录结构

每篇文章单独一个目录，目录内包含公众号、知乎、掘金三个版本，以及该篇文章对应配图：

```text
{两位序号}-{英文主题-slug}/
├── {两位序号}-{英文主题-slug}.md
├── {两位序号}-{英文主题-slug}-zhihu.md
├── {两位序号}-{英文主题-slug}-juejin.md
├── {两位序号}-{英文主题-slug}-image-01.png
└── ...
```

其中无平台后缀的 Markdown 为公众号版本，`-zhihu.md` 为知乎版本，`-juejin.md` 为掘金版本。

## 文章目录

- [x] `01-redeploy-myself`：10 年前端失业后，我决定重新部署自己
- [x] `02-cloud-environment`：重新部署自己的第一步：先买一套能低成本试错的云环境
- [x] `03-k3s-instead-of-tke`：计划赶不上现实：从 TKE 改成自己安装 K3S
- [x] `04-nuxt3-docker-k3s`：把 Nuxt3 项目装进 Docker
- [x] `05-ghcr-private-image`：从本地镜像到 GHCR：让服务器拉到我的应用
- [x] `06-github-actions-k3s`：用 GitHub Actions 自动发布：把手动部署变成流水线
- [x] `07-configmap-secret`：ConfigMap 和 Secret：前端也要认真理解配置和密钥
- [x] `08-cls-logging`：接入 CLS 日志：线上问题终于不再只靠猜
- [x] `09-agent-runtime`：部署跑通之后，我才真正开始做 Agent
- [x] `10-agent-dual-api`：我终于明白，Agent 为什么不能只有一个聊天接口
- [x] `11-agent-event-timeline`：我不想让 AI 黑盒执行，所以给 Agent 做了一条 Timeline
- [x] `12-tool-skill-workflow`：Agent 调工具不是魔法，我把 Tool 和 Skill 拆开实现了一遍
- [x] `13-run-detail-replay`：我给 Agent 做了一个执行回放页
- [x] `14-prisma-mysql-persistence`：我把 Agent 的每一步都落进了数据库
- [x] `15-real-model-tool-calling`：我第一次把真实大模型接进 Agent，才发现不只是调一个接口
- [x] `16-public-trial-safety`：把 Agent 发给朋友试用前，我先给它加了几道保险
- [x] `17-https-cookie-ingress`：上线后才发现，HTTPS、Cookie 和环境变量都不是小事
- [x] `18-model-timeout-network`：我以为线上部署完成了，结果卡在服务器到大模型的网络链路

## 图片整理规则

- 原 `images/00` 到 `images/17` 已分别归入 `01` 到 `18` 对应文章目录。
- 每篇文章的图片统一命名为 `{文章目录名}-image-01.png`、`{文章目录名}-image-02.png` 等。
- 原 `头图.png` 优先作为该篇的 `image-01.png`。
