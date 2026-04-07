# FormGenie 任务追踪

> 最后更新：2026-04-07

---

## 已完成

### Harness Engineering 架构重构

- [x] Phase A: Sidebar 移到右侧 (3 处改动)
- [x] Phase 1: 统一 Tool 接口 (`Tool.ts` + `toolRegistry.ts`)
- [x] Phase 2: Agent Loop 核心重构 (while-loop 替代递归)
- [x] Phase 3: Feedback Controller (`feedbackController.ts`)
- [x] Phase 4: Quality Gate (`qualityGate.ts`)
- [x] Phase 5: Session Manager (`sessionManager.ts`)
- [x] Phase 6: Context Engineer (`contextEngineer.ts`)
- [x] Phase 7: 集成到 agentLoop.ts (7 步循环)
- [x] 文档更新 (ARCHITECTURE.md + AGENTIC_REFACTOR_PLAN.md)
- [x] tsconfig.json 排除 sample-project/

### PrintForm.js 知识审计

- [x] SOP 文档完整性审查 (95% 覆盖)
- [x] System Instructions 审查 (深度嵌入)
- [x] RAG 检索系统审查 (意图感知)
- [x] 参考模板审查 (23 个 HTML)
- [x] 校验器审查 (PrintSafe + HTML Strict)

---

## 已实现的 PrintForm.js 知识层

| 层 | 模块 | 覆盖率 |
|----|------|--------|
| SOP 文档 | `docs/PRINTFORM_JS_SOP.md` (217 行) | 95% |
| 生成器 SOP | `docs/PRINTFORM_JS_GENERATOR_SOP.md` (263 行) | 90% |
| System Prompt | `systemInstructions.ts` (390 行) | 90% |
| RAG 检索 | `printformSop/retrieveSopInfo.ts` (300 行) | 85% |
| 参考模板 | `printform-js/*.html` (23 个) | 80% |
| PrintSafe 校验 | `printSafeValidator.ts` (210 行, 24 规则) | 80% |
| HTML 校验 | `strictHtmlTableValidator.ts` (283 行) | 80% |
| Auto-Grounding | `autoGrounding.ts` (模板自动加载) | 75% |
| Feedback | `feedbackController.ts` (5 个 Sensor) | 新增 |

---

## 待改进

### P1 — 高优先级（已完成）

- [x] prowheader/prowitem 列数一致性校验 (`printSafeValidator.ts`)
- [x] processed class (`_processed`) 样式校验 (`printSafeValidator.ts`)
- [x] autoGrounding 主动提示 prowitem 数量不足 (`autoGrounding.ts`)
- [x] feedbackController 增加列数一致性检查 (`feedbackController.ts`)

### P2 — 中优先级

- [ ] PADDT/PTAC 示例模板 (index018_paddt.html, index019_ptac.html)
- [ ] RAG 推断增强 (PADDT word count, PTAC splitting)
- [ ] Session 持久化到 IndexedDB (目前仅内存)
- [ ] 错误自动修复工具 (auto-fix missing colgroup 等)

### P3 — 低优先级

- [ ] 并发工具执行 (安全工具并行)
- [ ] 消息链 parentId (对话树)
- [ ] debug 模式文档 (`data-debug="y"`)
- [ ] N-Up 打印示例模板
- [ ] Mobile/viewport 示例模板
