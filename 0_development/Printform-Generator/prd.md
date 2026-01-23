# FormGenie - ERP Print Form Builder

## Product Requirements Document (PRD)

**版本:** 1.0  
**最后更新:** 2026-01-23  
**产品负责人:** Tech Lead  
**状态:** ✅ Active Development

---

## 📋 目录

1. [产品概述](#产品概述)
2. [核心价值主张](#核心价值主张)
3. [目标用户](#目标用户)
4. [功能需求](#功能需求)
5. [技术架构](#技术架构)
6. [用户体验流程](#用户体验流程)
7. [非功能性需求](#非功能性需求)
8. [技术栈](#技术栈)
9. [开发规范](#开发规范)
10. [路线图](#路线图)

---

## 🎯 产品概述

FormGenie 是一个**基于 AI 的 ERP 打印表单生成器**,允许用户通过自然语言或上传图片快速创建专业的发票、装箱单和报表。

### 核心特性

- **AI Copilot**: 使用 Gemini 3 Pro 进行智能代码重构和样式调整
- **视觉复制**: 上传现有发票图片,AI 自动生成匹配的 HTML/CSS
- **专业 IDE**: 集成 Monaco Editor (VS Code 核心)
- **实时预览**: 分屏编辑器,即时渲染 HTML/CSS
- **打印隔离**: 使用 iframe 隔离渲染,确保所见即所得

---

## 💡 核心价值主张

### 问题陈述

传统 ERP 系统的打印表单设计存在以下痛点:

1. **技术门槛高**: 需要专业前端开发人员编写 HTML/CSS
2. **效率低下**: 手动调整样式耗时且容易出错
3. **维护困难**: 表单逻辑复杂,修改风险高
4. **缺乏标准化**: 不同开发者的代码风格不一致

### 解决方案

FormGenie 通过 AI 技术降低门槛:

- ✅ **自然语言交互**: "添加税费列" → AI 自动修改代码
- ✅ **图片转代码**: 上传发票图片 → AI 生成精确的 HTML/CSS
- ✅ **智能上下文理解**: AI 理解当前代码结构,执行精确的"搜索替换"操作
- ✅ **严格的代码规范**: 强制使用 `<colgroup>` 和内联样式,确保打印兼容性

---

## 👥 目标用户

### 主要用户角色

#### 1. **ERP 实施顾问** (Primary)

- **需求**: 快速为客户定制发票模板
- **痛点**: 不懂前端代码,依赖开发团队
- **价值**: 通过自然语言即可完成 80% 的定制需求

#### 2. **前端开发人员** (Secondary)

- **需求**: 提高打印表单开发效率
- **痛点**: 重复性工作多,调试打印样式耗时
- **价值**: AI 辅助快速生成基础代码,专注于复杂逻辑

#### 3. **业务分析师** (Tertiary)

- **需求**: 快速原型设计和需求验证
- **痛点**: 无法直观展示表单效果
- **价值**: 上传参考图片即可生成可交互的原型

---

## 🎨 功能需求

### 1. **AI 对话界面**

#### 1.1 聊天面板

- **FR-1.1.1**: 用户可以通过文本输入与 AI 交互
- **FR-1.1.2**: 支持上传图片(发票、装箱单等)进行视觉分析
- **FR-1.1.3**: 显示 AI 的处理状态(思考中、应用更改、验证中)
- **FR-1.1.4**: 保留完整的对话历史记录

#### 1.2 智能工具调用

- **FR-1.2.1**: `modify_code` - 修改代码片段
  - `rewrite`: 完全重写文件
  - `replace`: 精确替换代码片段
- **FR-1.2.2**: `insert_content` - 插入新内容
  - `before`: 在目标前插入
  - `after`: 在目标后插入
- **FR-1.2.3**: `manage_plan` - 任务管理
  - `create_plan`: 创建任务计划
  - `mark_completed`: 标记任务完成
  - `mark_failed`: 标记任务失败

### 2. **代码编辑器**

#### 2.1 Monaco Editor 集成

- **FR-2.1.1**: 语法高亮 (HTML/CSS)
- **FR-2.1.2**: 自动补全和括号匹配
- **FR-2.1.3**: 错误检测和提示
- **FR-2.1.4**: 支持手动编辑和 AI 编辑

#### 2.2 视图模式

- **FR-2.2.1**: **Preview** - 仅显示预览
- **FR-2.2.2**: **Split** - 编辑器和预览分屏
- **FR-2.2.3**: **Code** - 仅显示代码编辑器

### 3. **实时预览**

#### 3.1 打印预览

- **FR-3.1.1**: iframe 隔离渲染,确保打印样式准确
- **FR-3.1.2**: 缩放控制 (25% - 250%)
- **FR-3.1.3**: 页面尺寸配置 (宽度/高度)
- **FR-3.1.4**: 一键打印功能

### 4. **项目管理**

#### 4.1 文件管理

- **FR-4.1.1**: 支持多文件项目
- **FR-4.1.2**: 文件切换和重命名
- **FR-4.1.3**: 创建新文件

#### 4.2 历史记录

- **FR-4.2.1**: 自动保存每次修改
- **FR-4.2.2**: 显示修改描述和时间戳
- **FR-4.2.3**: 一键回滚到历史版本

#### 4.3 任务面板

- **FR-4.3.1**: 显示 AI 生成的任务计划
- **FR-4.3.2**: 实时更新任务状态
- **FR-4.3.3**: 任务状态标识 (待处理、进行中、已完成、失败)

### 5. **数据与模版驱动 (New)**

#### 5.1 模拟数据面板

- **FR-5.1.1**: 支持粘贴 JSON 示例数据，AI 根据数据结构自动建议表格列。
- **FR-5.1.2**: 自动生成数据插值占位符 (例如 `{{invoice_no}}`)。

#### 5.2 灵感图库

- **FR-5.2.1**: 可视化展示本地 `printform-js` 中的 HTML 模版资产。
- **FR-5.2.2**: 一键加载模版并启动 AI 引导会话。

### 5. **设置和配置**

#### 5.1 API 配置

- **FR-5.1.1**: Gemini API Key 输入和验证
- **FR-5.1.2**: API 连接测试功能
- **FR-5.1.3**: 模型选择 (Gemini 3 Pro / Flash)

#### 5.2 工具箱配置

- **FR-5.2.1**: 启用/禁用特定 AI 工具
- **FR-5.2.2**: 按类别批量选择工具
- **FR-5.2.3**: 工具分类:
  - Core Editing (核心编辑)
  - Data & Grounding (数据和基础)
  - Code Quality (代码质量)
  - Utilities (实用工具)

#### 5.3 布局配置

- **FR-5.3.1**: 默认页面宽度设置
- **FR-5.3.2**: 默认页面高度设置
- **FR-5.3.3**: 支持像素 (px) 和毫米 (mm) 单位

---

## 🏗️ 技术架构

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx (主应用)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Sidebar     │  │ Work Area    │  │ Settings Modal │ │
│  │ - Chat      │  │ - Preview    │  │                │ │
│  │ - Tasks     │  │ - Editor     │  │                │ │
│  │ - Files     │  │ - Split View │  │                │ │
│  │ - History   │  │              │  │                │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Hooks Layer (业务逻辑)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ useFormBuilder (Facade Pattern)                  │  │
│  │  ├─ useSettings (API Key, 配置)                  │  │
│  │  ├─ useFileProject (文件管理, 历史)              │  │
│  │  └─ useAgentChat (AI 交互)                       │  │
│  │      ├─ toolExecutor (工具执行)                  │  │
│  │      └─ conversationHandler (对话处理)           │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 Services Layer (服务层)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ GeminiService                                    │  │
│  │  - 初始化 Gemini AI 客户端                       │  │
│  │  - 流式消息处理                                  │  │
│  │  - 工具声明和注入                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                External APIs (外部服务)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Google Gemini 3 Pro API                          │  │
│  │  - 自然语言理解                                  │  │
│  │  - 视觉分析 (图片转代码)                         │  │
│  │  - 函数调用 (Function Calling)                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 数据流

```
用户输入 → ChatPanel → useAgentChat → GeminiService → Gemini API
                                ↓
                        conversationHandler
                                ↓
                         toolExecutor
                                ↓
                      updateFileContent
                                ↓
                          FormPreview
```

---

## 🎭 用户体验流程

### 场景 1: 自然语言修改表单

```
1. 用户输入: "添加一列显示税率"
   ↓
2. AI 分析当前 HTML 结构
   ↓
3. AI 调用 modify_code 工具
   ↓
4. 显示状态: "应用代码更改..."
   ↓
5. 更新文件内容
   ↓
6. 实时预览更新
   ↓
7. AI 回复: "✅ 已添加税率列"
```

### 场景 2: 图片转代码

```
1. 用户上传发票图片
   ↓
2. 用户输入: "复制这个发票的样式"
   ↓
3. AI 视觉分析图片
   - 识别布局结构
   - 提取颜色和字体
   - 分析表格列数
   ↓
4. AI 调用 modify_code (rewrite)
   ↓
5. 生成完整的 HTML/CSS
   ↓
6. 预览显示新表单
```

### 场景 3: 复杂任务规划

```
1. 用户输入: "创建一个多页发票,包含明细、税费和总计"
   ↓
2. AI 调用 manage_plan (create_plan)
   - 任务 1: 创建页眉和公司信息
   - 任务 2: 添加明细表格
   - 任务 3: 添加税费计算
   - 任务 4: 添加总计部分
   - 任务 5: 添加页脚
   ↓
3. AI 逐步执行每个任务
   ↓
4. 每完成一个任务,标记为 "已完成"
   ↓
5. 用户可在任务面板查看进度
```

---

## ⚙️ 非功能性需求

### 性能要求

- **NFR-1**: AI 响应时间 < 3 秒 (首次响应)
- **NFR-2**: 代码编辑器加载时间 < 1 秒
- **NFR-3**: 预览渲染延迟 < 500ms

### 可靠性

- **NFR-4**: API 错误处理和友好提示
- **NFR-5**: 自动保存防止数据丢失
- **NFR-6**: 递归深度限制 (防止无限循环)

### 安全性

- **NFR-7**: API Key 本地存储 (localStorage)
- **NFR-8**: 不上传敏感数据到服务器
- **NFR-9**: iframe 沙箱隔离

### 可维护性

- **NFR-10**: 代码文件不超过 300 行
- **NFR-11**: 模块化设计,职责单一
- **NFR-12**: TypeScript 类型安全

### 可用性

- **NFR-13**: 响应式布局 (支持不同屏幕尺寸)
- **NFR-14**: 可调整侧边栏宽度
- **NFR-15**: 键盘快捷键支持 (Enter 发送消息)

---

## 🛠️ 技术栈

### 前端框架

- **React 19**: 最新版本,支持并发特性
- **TypeScript**: 类型安全
- **Vite**: 快速构建工具

### UI 组件

- **Tailwind CSS**: 实用优先的 CSS 框架
- **Monaco Editor**: VS Code 核心编辑器
- **自定义组件**: 无第三方 UI 库依赖

### AI 集成

- **Google GenAI SDK**: `@google/genai` v1.37.0
- **Gemini 3 Pro**: 高质量代码生成和视觉能力
- **Gemini 3 Flash**: 快速响应 (可选)

### 状态管理

- **React Hooks**: useState, useRef, useCallback
- **Facade Pattern**: useFormBuilder 统一管理

### 开发工具

- **ESM Modules**: 通过 esm.sh CDN
- **Google Fonts**: Inter (UI), JetBrains Mono (代码)

---

## 📐 开发规范

### 代码规范

#### 1. 文件大小限制

- ✅ **每个文件不超过 300 行代码**
- ✅ 超过 300 行必须拆分为多个模块

#### 2. 命名规范

- **组件**: PascalCase (`ChatPanel.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAgentChat.ts`)
- **工具函数**: camelCase (`executeToolCall`)
- **常量**: UPPER_SNAKE_CASE (`AVAILABLE_TOOLS`)

#### 3. 目录结构

```
/
├── components/          # UI 组件
│   ├── Chat/           # 聊天相关
│   ├── Editor/         # 编辑器
│   ├── Preview/        # 预览
│   ├── Settings/       # 设置
│   └── Sidebar/        # 侧边栏
├── hooks/              # 自定义 Hooks
│   └── agent/          # AI Agent 相关
├── services/           # 外部服务
├── utils/              # 工具函数
├── types.ts            # TypeScript 类型定义
└── constants.ts        # 常量配置
```

#### 4. 打印表单规范

- ✅ **必须使用 `<table>` 布局** (不允许 `<div>`)
- ✅ **必须使用 `<colgroup>` 定义列宽**
- ✅ **必须使用内联样式** (`style="..."`)
- ✅ **禁止使用 CSS 类** (除非 `@media print`)
- ✅ **分页语义化**: 必须支持 `tb_page_break_after` 和 `tb_page_break_before` 等分页控制类。
- ✅ **宽度限制**: 强制检查总宽度是否超过 210mm (A4 宽度)。

#### 5. 注释规范

- **函数**: JSDoc 注释
- **复杂逻辑**: 行内注释说明
- **TODO**: 使用 `// TODO:` 标记

---

## 🗺️ 路线图

### ✅ Phase 1: MVP (已完成)

- [x] 基础 AI 对话功能
- [x] Monaco Editor 集成
- [x] 实时预览
- [x] 文件管理
- [x] 历史记录
- [x] 设置面板

### 🚧 Phase 2: 优化 & 生产特性 (进行中)

- [x] 代码重构 (符合 300 行规则)
- [ ] **Print-Safe Validator**: 自动修复非打印安全代码。
- [ ] **视觉品牌对齐**: 从公司 Logo 自动提取配色方案。
- [ ] **数据模拟**: 支持 JSON 数据绑定和占位符提示。

### 📅 Phase 3: 增强功能 (计划中)

- [ ] **模版市场 (Template Gallery)**: 可视化本地资产库。
- [ ] 多语言支持 (i18n)
- [ ] 导出为 PDF (服务端渲染支持)
- [ ] 版本控制集成

### 🔮 Phase 4: 企业版 (未来)

- [ ] 团队协作
- [ ] 权限管理
- [ ] 审计日志
- [ ] 私有部署

---

## 📊 成功指标

### 用户指标

- **采用率**: 目标 80% 的 ERP 实施顾问使用
- **满意度**: NPS > 50
- **效率提升**: 表单开发时间减少 70%

### 技术指标

- **代码质量**: 所有文件 < 300 行
- **测试覆盖**: > 80%
- **性能**: P95 响应时间 < 3 秒

### 业务指标

- **活跃用户**: 月活 > 100
- **表单创建量**: 每月 > 500 个表单
- **错误率**: < 1%

---

## 📝 附录

### A. 工具列表

#### Core Editing

- `code_replace`: Smart Replace
- `code_rewrite`: Full Rewrite
- `code_insert`: Content Insert
- `undo_last`: Undo Capability

#### Data & Grounding

- `web_search`: Web Search
- `read_file`: Read File
- `read_all_files`: Project Scan
- `grep_search`: Grep Search
- `image_analysis`: Vision Analysis

#### Code Quality

- `html_validation`: Strict HTML Validator
- `prettier_fmt`: Auto Formatter
- `explain_code`: Explain Mode
- `extract_colors`: Color Extractor
- `extract_brand_colors`: (New) 从 Logo 提取品牌色
- `print_safe_validator`: (New) 强制 Table 布局与 Page Break 检查
- `diff_check`: Diff Checker

#### Utilities

- `calculator`: Math Engine
- `currency_convert`: Currency Converter
- `translator`: Auto Translate
- `lorem_ipsum`: Lorem Generator
- `generate_docs`: Doc Generator
- `unit_test`: Test Generator

### B. API 参考

#### Gemini API

- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta`
- **Model**: `gemini-3-pro-preview`
- **Max Tokens**: 8192
- **Temperature**: 0.7

### C. 环境变量

```bash
# .env.local
VITE_GEMINI_API_KEY=your_api_key_here
```

---

## 📞 联系方式

- **产品负责人**: Tech Lead
- **开发团队**: FormGenie Team
- **支持邮箱**: support@formgenie.dev
- **文档**: https://docs.formgenie.dev

---

**最后更新**: 2026-01-23  
**版本**: 1.0  
**状态**: ✅ Active Development
