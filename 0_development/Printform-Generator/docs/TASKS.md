# FormGenie 任务追踪

> 最后更新：2026-04-07

---

## 已完成

### Harness Engineering / Agentic Runtime 架构重构

- [x] Phase A: Sidebar 移到右侧 (3 处改动)
- [x] Phase 1: 统一 Tool 接口 (`Tool.ts` + `toolRegistry.ts`)
- [x] Phase 2: Agent Loop 核心重构 (while-loop 替代递归)
- [x] Phase 3: Feedback Controller (`feedbackController.ts`)
- [x] Phase 4: Dual-layer Quality Gate (`qualityGate.ts` + `goalEvaluator.ts`)
- [x] Phase 5: Session Manager 持久化到 IndexedDB (`sessionManager.ts`)
- [x] Phase 6: Context Engineer 真正参与 prompt 组装 (`contextEngineer.ts`)
- [x] Phase 7: 集成到 `agentLoop.ts` (7 步循环 + resume / rollback / structured result)
- [x] Session Resume UI (`useAgentChat.ts` + `Sidebar.tsx`)
- [x] Plan State 扩展 (`acceptanceCriteria` / `dependsOn` / `blockedBy` / `evidence`)
- [x] `manage_plan` 新动作 (`block_task` / `unblock_task` / `attach_evidence` / `update_acceptance`)
- [x] 文档更新 (ARCHITECTURE.md + AGENTIC_REFACTOR_PLAN.md + TASKS.md)
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
- [ ] 错误自动修复工具 (auto-fix missing colgroup 等)
- [ ] GoalEvaluator 语义增强（当前仍是关键词启发式，不是强语义验证）
- [ ] `continue_current_task` 分支立即持久化 session（当前 checkpoint 已保存，但 session 未立即落盘）
- [ ] 创建计划时自动生成 acceptance criteria，避免默认空 criteria 导致任务过早推进

### P3 — 低优先级

- [ ] 并发工具执行 (安全工具并行)
- [ ] 消息链 parentId (对话树)
- [ ] debug 模式文档 (`data-debug="y"`)
- [ ] N-Up 打印示例模板
- [ ] Mobile/viewport 示例模板

---

## 当前真实状态备注

- Session 持久化：已实现到 IndexedDB，并支持 Resume Banner 与 checkpoint-first rollback。
- 任务推进：已移除“编辑成功即自动完成任务”的隐式推进；当前推进主要由 `goalEvaluator` + `manage_plan` 决策。
- 已知缺口：
  - `goalEvaluator` 仍是启发式判断，严格度不足。
  - 新建 plan 默认 `acceptanceCriteria=[]`，若模型不主动补齐，任务仍可能在文件通过后被推进。
  - `continue_current_task` 分支尚未在同一分支末尾立即 `persistSession()`。
