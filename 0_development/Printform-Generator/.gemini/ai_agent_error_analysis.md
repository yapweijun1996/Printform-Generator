# AI Agent 错误分析报告

**日期**: 2026-01-24  
**问题**: AI Agent 生成的 HTML 违反了 PrintForm.js SOP 规范

---

## 🔍 问题 HTML 代码分析

### 错误 1: **Section 结构错误** ❌

AI 生成的代码:
```html
<!-- ❌ 错误:pheader 不是 section-as-page-frame -->
<table class="pheader" cellpadding="0" cellspacing="0" border="0" 
      style="width:100%; table-layout:fixed; margin-bottom: 20px;">
    <colgroup>
        <col style="width:50%">  <!-- ❌ 错误:应该是 15px/auto/15px -->
        <col style="width:50%">
    </colgroup>
    <tr>
        <td>...</td>
        <td>...</td>
    </tr>
</table>
```

**正确的结构应该是**:
```html
<!-- ✅ 正确:pheader 作为 section-as-page-frame -->
<table class="pheader" cellpadding="0" cellspacing="0" border="0" 
      style="width:100%; table-layout:fixed;">
    <colgroup>
        <col style="width:15px">   <!-- ✅ 左边距 -->
        <col style="width:auto">    <!-- ✅ 内容区 -->
        <col style="width:15px">    <!-- ✅ 右边距 -->
    </colgroup>
    <tr>
        <td style="box-sizing:border-box;"></td>
        <td style="box-sizing:border-box; vertical-align:top;">
            <!-- 实际内容放在这里 -->
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
                <colgroup>
                    <col style="width:50%">
                    <col style="width:50%">
                </colgroup>
                <tr>
                    <td>...</td>
                    <td>...</td>
                </tr>
            </table>
        </td>
        <td style="box-sizing:border-box;"></td>
    </tr>
</table>
```

### 错误 2: **pdocinfo 结构错误** ❌

```html
<!-- ❌ 错误:pdocinfo 不是 section-as-page-frame -->
<table class="pdocinfo" cellpadding="0" cellspacing="0" border="0" 
      style="width:100%; table-layout:fixed; margin-bottom: 20px;">
    <colgroup>
        <col style="width:48%">  <!-- ❌ 错误 -->
        <col style="width:4%">
        <col style="width:48%">
    </colgroup>
    ...
</table>
```

### 错误 3: **prowheader 结构错误** ❌

```html
<!-- ❌ 错误:prowheader 不是 section-as-page-frame -->
<table class="prowheader" cellpadding="0" cellspacing="0" border="0" 
      style="width:100%; table-layout:fixed;">
    <colgroup>
        <col style="width:15%">  <!-- ❌ 错误:应该是 15px/auto/15px -->
        <col style="width:55%">
        <col style="width:10%">
        <col style="width:10%">
        <col style="width:10%">
    </colgroup>
    ...
</table>
```

### 错误 4: **pfooter_pagenum 使用 div** ❌

```html
<!-- ❌ 致命错误:pfooter_pagenum 必须是 table -->
<div class="pfooter_pagenum"></div>
```

**正确的应该是**:
```html
<table class="pfooter_pagenum" cellpadding="0" cellspacing="0" border="0" 
      style="width:100%; table-layout:fixed;">
    <colgroup>
        <col style="width:15px">
        <col style="width:auto">
        <col style="width:15px">
    </colgroup>
    <tr>
        <td></td>
        <td style="text-align:center; padding:10px 0; font-size:8pt;">
            Page <span data-page-number></span> of <span data-page-total></span>
        </td>
        <td></td>
    </tr>
</table>
```

### 错误 5: **过度使用 div 标签** ⚠️

```html
<!-- ❌ 在 table cell 内使用过多 div -->
<td>
    <div style="font-size:24pt; ...">My Company name</div>
    <div style="font-size:10pt; ...">My company slogan</div>
    <div style="width:250px; ...">Insert Your Logo</div>
</td>
```

**应该尽量使用 table 结构**,或者至少减少 div 嵌套。

---

## 🎯 根本原因分析

### 1. **System Instructions 的歧义**

在 `systemInstructions.ts` 第 68-85 行:

```typescript
### SOP: SECTION-AS-PAGE-FRAME TABLE (MANDATORY)
All PrintForm.js sections MUST be implemented as a **3-column page frame table** (NOT an extra wrapper table).
This applies to:
- .pheader
- .pdocinfo / .pdocinfo002 / ...
- .prowheader
- each .prowitem (one per item row block; deterministic height)
- .pfooter_pagenum

For each section:
- The SECTION element itself MUST be a <table> with the section class on it (e.g. <table class="pheader" ...>).
- The SECTION table MUST include a <colgroup> with EXACTLY 3 columns:
  1) left col: 15px
  2) middle col: auto (content)
  3) right col: 15px
- Content MUST be rendered inside the middle <td>.
- Do NOT wrap sections in additional "page frame" tables.
```

**问题**: 虽然指令很明确,但 AI 可能误解了"Do NOT wrap sections in additional page frame tables"这句话。

### 2. **外层已有 Page Frame Table**

代码中已经有一个外层的 page frame table:

```html
<!-- Page Frame Table: 15px margins -->
<table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
    <colgroup>
        <col style="width:15px">
        <col style="width:auto">
        <col style="width:15px">
    </colgroup>
    <tr>
        <td></td>
        <td>
            <!-- ❌ AI 在这里直接放了 section tables,但没有给它们 15px/auto/15px 结构 -->
            <table class="pheader" ...>
```

**AI 的误解**: AI 认为外层已经有 page frame 了,所以 section tables 不需要再有 15px/auto/15px。

**正确理解**: **每个 section table 本身就应该是 page frame table**,不需要外层包装。

---

## 🛠️ 解决方案

### 方案 1: **修改 System Instructions (推荐)** ✅

在 `systemInstructions.ts` 中增强说明:

```typescript
### SOP: SECTION-AS-PAGE-FRAME TABLE (MANDATORY - CRITICAL)
**IMPORTANT**: Each PrintForm.js section (.pheader, .pdocinfo, .prowheader, .prowitem, .pfooter_pagenum) 
MUST be a standalone 3-column page-frame table. DO NOT create an outer wrapper table.

**WRONG PATTERN** ❌:
```html
<!-- ❌ DO NOT DO THIS -->
<table style="width:100%;">
  <colgroup><col style="width:15px"><col style="width:auto"><col style="width:15px"></colgroup>
  <tr>
    <td></td>
    <td>
      <table class="pheader" style="width:100%;">
        <colgroup><col style="width:50%"><col style="width:50%"></colgroup>
        ...
      </table>
    </td>
    <td></td>
  </tr>
</table>
```

**CORRECT PATTERN** ✅:
```html
<!-- ✅ CORRECT: pheader IS the page-frame table -->
<table class="pheader" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
  <colgroup>
    <col style="width:15px">   <!-- left margin -->
    <col style="width:auto">    <!-- content area -->
    <col style="width:15px">    <!-- right margin -->
  </colgroup>
  <tr>
    <td style="box-sizing:border-box;"></td>
    <td style="box-sizing:border-box; vertical-align:top;">
      <!-- Put your actual content table here -->
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
        <colgroup>
          <col style="width:50%">
          <col style="width:50%">
        </colgroup>
        <tr>
          <td>Company Info</td>
          <td>Document Info</td>
        </tr>
      </table>
    </td>
    <td style="box-sizing:border-box;"></td>
  </tr>
</table>

<!-- ✅ CORRECT: pdocinfo IS the page-frame table -->
<table class="pdocinfo" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
  <colgroup>
    <col style="width:15px">
    <col style="width:auto">
    <col style="width:15px">
  </colgroup>
  <tr>
    <td></td>
    <td>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
        <colgroup>
          <col style="width:48%">
          <col style="width:4%">
          <col style="width:48%">
        </colgroup>
        <tr>
          <td>Shipping Address</td>
          <td></td>
          <td>Invoice Address</td>
        </tr>
      </table>
    </td>
    <td></td>
  </tr>
</table>
```

**Key Rules**:
1. The section class (.pheader, .pdocinfo, etc.) MUST be on the outer table.
2. The outer table MUST have colgroup with 15px/auto/15px.
3. The actual content layout table goes INSIDE the middle <td>.
4. NEVER create a separate wrapper "page frame" table around sections.
```

### 方案 2: **增强 Print-Safe Validator** ✅

在 `printSafeValidator.ts` 中添加更严格的检查:

```typescript
// 检查 section 是否正确实现为 page-frame table
for (const cls of SECTION_CLASSES) {
  const tableOpenMatch = new RegExp(`<table\\b[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>`, 'i').exec(text);
  if (!tableOpenMatch) continue;

  const fromIdx = tableOpenMatch.index;
  const windowText = text.slice(fromIdx, Math.min(text.length, fromIdx + 2500));
  
  // 必须有 colgroup
  const hasColgroup = /<colgroup\b/i.test(windowText);
  if (!hasColgroup) {
    add('error', 'SECTION_NO_COLGROUP', `Section ".${cls}" must have a <colgroup>.`);
    continue;
  }
  
  // 必须有两个 15px 列
  const width15Count = (windowText.match(/width\s*:\s*15px/gi) || []).length;
  if (width15Count < 2) {
    add(
      'error',
      'SECTION_PAGE_FRAME',
      `Section ".${cls}" MUST be a 3-col page-frame table with colgroup widths 15px/auto/15px. Found ${width15Count} 15px columns, need 2.`,
    );
  }
}
```

### 方案 3: **提供更多示例模板** ✅

在 `printform-js` 目录中确保有清晰的示例,并在 System Instructions 中引用:

```typescript
### LEARNING FROM EXAMPLES (MANDATORY BEFORE FIRST EDIT)
Before making ANY structural changes, you SHOULD call load_reference_template to study a working example:
- Call load_reference_template() without arguments to see available templates
- Load "demo001.html" or "index.html" to see the CORRECT section-as-page-frame pattern
- Pay attention to how .pheader, .pdocinfo, .prowheader, and .pfooter_pagenum are structured
```

---

## 📊 影响评估

### 当前状态
- ❌ AI Agent 生成的 HTML 不符合 PrintForm.js SOP
- ❌ Print-Safe Validator 未能阻止这些错误(只有 warn,没有 error)
- ❌ 用户需要手动修复结构

### 修复后
- ✅ System Instructions 更加明确,减少歧义
- ✅ Print-Safe Validator 强制执行 section-as-page-frame 规则
- ✅ AI Agent 自动生成符合规范的代码

---

## 🎯 实施计划

### 优先级 1 (立即执行)
1. ✅ 更新 `services/gemini/systemInstructions.ts` - 增强 SOP 说明
2. ✅ 更新 `utils/printSafeValidator.ts` - 将 SECTION_PAGE_FRAME 从 warn 升级为 error

### 优先级 2 (本周内)
3. ✅ 创建标准模板示例 `printform-js/templates/standard-invoice.html`
4. ✅ 更新 `load_reference_template` 工具,确保 AI 能轻松访问示例

### 优先级 3 (下周)
5. ✅ 添加集成测试,验证 AI 生成的 HTML 符合规范
6. ✅ 创建 "Common Mistakes" 文档供 AI 参考

---

## 📝 总结

**根本原因**: System Instructions 中的"Do NOT wrap sections in additional page frame tables"被 AI 误解为"如果外层已有 page frame,section 就不需要了"。

**解决方法**: 
1. 明确说明每个 section **本身就是** page-frame table
2. 提供正确和错误的代码示例对比
3. 增强 validator 的错误检测

**预期效果**: AI Agent 将正确生成符合 PrintForm.js SOP 的 HTML 结构。
