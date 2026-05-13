# 大模型平台与模型选择知识库

本文用于记录 Super Agent Console 在接入真实大语言模型前需要对齐的基础概念、平台与模型的对应关系，以及当前项目的模型选择建议。

更新时间：2026-05-13

## 1. 基础概念

接入大模型时，需要区分三层概念：

```txt
模型服务平台 / MaaS
↓
具体模型 / 模型家族
↓
项目内 Model Adapter
```

### 1.1 模型服务平台

模型服务平台负责账号、鉴权、计费、API Endpoint、模型托管、限流、日志和控制台管理。

常见平台包括：

- 火山方舟
- 阿里云百炼
- 腾讯云 TokenHub / 混元平台
- 百度千帆
- OpenAI API
- Anthropic API
- Google Gemini API / Vertex AI
- DeepSeek 官方 API
- 智谱 BigModel
- Kimi 开放平台

### 1.2 具体模型

具体模型才是真正执行推理的能力来源，例如：

- 豆包 Seed / Doubao
- DeepSeek
- 通义千问 Qwen
- 智谱 GLM
- Kimi
- GPT
- Claude
- Gemini

同一个平台可能托管多个模型家族。例如火山方舟是平台，豆包 Seed、DeepSeek 等是平台里可选的具体模型。

### 1.3 项目内 Model Adapter

项目内 Adapter 是代码里的模型适配层，负责把不同平台的请求、响应、流式事件、tool call 格式，转换成 Agent Runtime 统一理解的数据结构。

建议项目内部按“平台协议”设计 Adapter，而不是按单个模型硬编码：

```txt
VolcengineArkAdapter
OpenAICompatibleAdapter
MockAdapter
```

具体模型通过配置切换：

```env
MODEL_PROVIDER=volcengine_ark
MODEL_NAME=doubao-seed-2-0-lite-260428
MODEL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
MODEL_API_KEY=xxx
```

这样后续从豆包 Seed 切到 DeepSeek、通义千问或其他 OpenAI-compatible 模型时，优先改配置，不改 Agent Runtime 主链路。

## 2. 平台与模型对应关系

| 平台 | 平台性质 | 常见模型 / 模型家族 | 当前项目适配建议 |
| --- | --- | --- | --- |
| 火山方舟 | 火山引擎 MaaS 平台 | 豆包 Seed / Doubao、DeepSeek 等 | 当前优先选择。云服务平台和模型管理链路清晰，适合作为第一版真实模型入口。 |
| 阿里云百炼 | 阿里云 MaaS 平台 | 通义千问 Qwen、DeepSeek、Kimi、GLM 等 | 后续可通过 OpenAI-compatible Adapter 或独立 Adapter 接入。 |
| 腾讯云 TokenHub | 腾讯云 MaaS 平台 | 混元、DeepSeek、Kimi、GLM、Qwen 等 | 当前基础设施在腾讯云，后续可以作为云资源同平台方案评估。 |
| 百度千帆 | 百度智能云 MaaS 平台 | 文心 ERNIE、DeepSeek、Qwen 等 | 可作为企业云平台方案备选。 |
| DeepSeek 官方 API | 模型厂商官方平台 | DeepSeek Chat / Reasoner 等 | 适合直接接入 DeepSeek，链路更短，但账号、计费和网络需要单独处理。 |
| 智谱 BigModel | 模型厂商官方平台 | GLM 系列 | 适合直接接入 GLM 系列模型。 |
| Kimi 开放平台 | 模型厂商官方平台 | Kimi K 系列 | 适合长上下文和 Agent 场景评估。 |
| OpenAI API | 模型厂商官方平台 | GPT 系列 | 能力强，但网络、支付和合规需要单独考虑。 |
| Anthropic API | 模型厂商官方平台 | Claude 系列 | Agent 和代码能力强，但接入门槛较高。 |
| Google Gemini API / Vertex AI | Google 平台 | Gemini 系列 | 多模态和长上下文能力强，国内网络和账号体系需要额外处理。 |

## 3. 火山方舟与豆包 Seed 2.0

火山方舟是模型服务平台，豆包 Seed 2.0 是平台中可以调用的模型家族之一。

从项目命名上看，应该避免把“火山方舟”和“豆包模型”混成同一个概念：

```txt
错误理解：接入火山方舟模型
更准确：通过火山方舟平台接入豆包 Seed 2.0 模型
```

## 4. Seed 2.0 系列对比

> 说明：火山方舟控制台可用模型和具体模型 ID 会随平台上架策略变化。接入时以控制台可选模型和官方文档为准，本文只记录当前阶段的工程选型建议。

| 模型系列 | 定位 | 优点 | 代价 / 风险 | 适合场景 |
| --- | --- | --- | --- | --- |
| Seed 2.0 Pro | 高能力模型 | 推理、复杂任务、综合质量更好，适合对答案质量要求高的场景 | 成本和响应时延通常更高 | 复杂 Agent 决策、复杂 JD 分析、多步骤推理、对外演示关键链路 |
| Seed 2.0 Lite | 性价比模型 | 成本、速度、效果相对均衡；官方近期重点升级了 Agent、Coding、GUI 和多模态理解相关能力 | 极复杂推理能力通常弱于 Pro | 当前项目默认推荐：Agent MVP、tool call、Skill 编排、面试准备计划生成 |
| Seed 2.0 Mini | 轻量模型 | 成本低、响应快，适合高频简单任务 | 复杂理解、长链路推理和稳定 JSON 输出能力可能不足 | 健康检查、简单分类、标题摘要、低成本测试 |
| Seed Code / Coding 专项模型 | 代码专项模型 | 面向代码生成、代码理解、工程任务优化 | 不一定适合通用 Agent 对话；具体可用性以控制台为准 | 后续如果做代码 Agent 或仓库分析，可以单独评估 |

## 5. 当前项目推荐选择

当前 Super Agent Console 的第一版真实模型接入，建议：

```txt
模型平台：火山方舟
默认模型：Seed 2.0 Lite
备选高质量模型：Seed 2.0 Pro
低成本测试模型：Seed 2.0 Mini
```

原因：

- 当前 MVP 不是做极限推理，而是验证完整 Agent 工程链路：Run 创建、SSE、Tool Call、Skill 编排、落库、Run 详情复盘。
- Seed 2.0 Lite 在成本、速度和质量之间更平衡，更适合频繁本地调试和演示。
- Tool / Skill 的确定性由服务端 schema、白名单、workflow 和参数校验兜底，不需要一开始就把所有压力都交给最强模型。
- 如果 Lite 在 tool call 稳定性、JSON 输出或复杂 JD 分析上不够稳定，再把同一套配置切到 Pro 做对比。
- Mini 更适合做简单任务或压测，不建议作为当前 Agent 主模型。

推荐配置语义：

```env
MODEL_PROVIDER=volcengine_ark
MODEL_NAME=doubao-seed-2-0-lite-260428
MODEL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
MODEL_API_KEY=xxx
MODEL_TEMPERATURE=0.2
MODEL_TOP_P=0.8
MODEL_MAX_TOKENS=4096
```

如果火山方舟控制台提供更具体的版本号模型 ID，例如带日期后缀的 Seed 2.0 Lite，应使用控制台实际可调用的模型 ID：

```env
MODEL_NAME=控制台中的具体模型ID
```

## 6. 项目开发原则

真实模型接入阶段遵循以下原则：

- Agent Runtime 只依赖统一 `ModelAdapter` 接口。
- 平台鉴权、endpoint、流式协议解析放在 Adapter 内。
- 具体模型通过 `MODEL_NAME` 切换。
- mock 模式继续保留，用于本地无 key、模型服务不可用、调试前端流式协议等场景。
- 不在代码里硬编码 API Key、模型密钥或具体线上 endpoint。
- 如果要比较模型效果，优先保持同一 prompt、同一 Tool Schema、同一用户输入，只切换 `MODEL_NAME`。

## 7. 后续接入顺序

1. 把现有 `doubao` adapter 命名和配置语义调整为 `volcengine_ark`。
2. 在 `.env.example` 中补充通用模型配置：`MODEL_PROVIDER`、`MODEL_NAME`、`MODEL_BASE_URL`、`MODEL_API_KEY`。
3. 实现火山方舟真实调用。
4. 先验证普通文本流式输出。
5. 再验证模型返回 tool call。
6. 服务端校验 tool call 白名单和参数 schema。
7. Tool / Skill 执行完成后，将 Tool Result 回填给模型。
8. 模型基于 Tool Result 生成最终答案，并通过 SSE 推送 `final_answer_delta`。

## 8. 参考资料

- [火山方舟模型列表](https://www.volcengine.com/docs/82379/1593704)
- [豆包 Seed 2.0 官方介绍](https://seed.bytedance.com/seed2)
- [火山引擎开发者：豆包大模型 1.5 Pro / 1.5 Lite / Seed 2.0 Lite 升级说明](https://developer.volcengine.com/articles/7636596381943070763)
- [阿里云百炼模型列表](https://help.aliyun.com/zh/model-studio/models)
- [腾讯云 TokenHub 模型广场](https://cloud.tencent.com/document/product/1823/130051)
- [DeepSeek API 文档](https://api-docs.deepseek.com/)
