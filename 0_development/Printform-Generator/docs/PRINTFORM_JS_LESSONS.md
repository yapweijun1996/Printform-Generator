# PrintForm.js 实测教训（Live Test 2026-04-07）

> 通过 Chrome MCP live test 发现的问题和纠正

---

## 1. 错误认知 vs 实际行为

### 1.1 Section 元素类型

| 认知 | 实际 |
|------|------|
| ❌ Section **必须**是 `<table>` | ✅ Section 可以是 `<div>` 或 `<table>`，PrintForm.js **只看 class name** |
| ❌ 每个 section 必须是 3-col page-frame table (15px/auto/15px) | ✅ 3-col page-frame 是**可选的页边距方案**，不是强制要求 |
| ❌ pfooter_pagenum 必须是 `<table>` | ✅ 可以是 `<div>` 或 `<table>` |

**证据：**
- `delivery_order_test.html` 用 `<div class="pheader block">` ✅ 正常工作
- `demo001.html` 用 `<table class="paper_width pheader">` ✅ 正常工作
- PrintForm.js 源码 `collectSections` 方法通过 `querySelector('.pheader')` 查找，不限制元素类型

### 1.2 列宽定义方式

| 认知 | 实际 |
|------|------|
| ❌ **必须**用 `<colgroup>` 定义列宽 | ✅ `<colgroup>` 或 `<td style="width:">` 都可以 |
| ❌ **禁止**在 `<td>` 上设置 width | ✅ 参考模板大量使用 `<td style="width: 15px">` |

**证据：**
- `demo001.html` 用 `<td style="box-sizing: border-box; width: 15px">` 直接在 td 上设宽度
- `delivery_order_test.html` 用 CSS class `.col-no { width: 60px }` 在 th 上设宽度

### 1.3 中间列 auto vs inherit

| 认知 | 实际 |
|------|------|
| ❌ 中间列用 `width: auto` | ✅ 参考模板用 `width: inherit` |

**证据：** `demo001.html` line 49: `<td style="box-sizing: border-box; width: inherit">`

### 1.4 data-repeat-docinfo 默认值

| 认知 | 实际 |
|------|------|
| ❌ 不设 data-repeat-docinfo 就不重复 | ✅ PrintForm.js SOP 说 `data-repeat-docinfo` 默认值是 `"y"`（会重复） |

**证据：** `PRINTFORM_JS_GENERATOR_SOP.md` line 103: `data-repeat-docinfo="y"` — Repeat `.pdocinfo` on every page (default: `y`)

---

## 2. 参考模板结构对比

### demo001.html（Table 模式）

```html
<div class="paper_width printform" data-papersize-width="750" data-papersize-height="1050" ...>

  <!-- pheader: 外层 table 做 page-frame -->
  <table class="paper_width pheader" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed">
    <tr>
      <td style="width: 15px"></td>
      <td style="width: inherit"></td>
      <td style="width: 15px"></td>
    </tr>
    <tr><td></td><td><!-- 实际内容 --></td><td></td></tr>
  </table>

  <!-- prowitem: 每行一个 table -->
  <table class="paper_width prowitem" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed">
    <tr>
      <td style="width: 15px"></td>
      <td style="width: inherit"></td>
      <td style="width: 15px"></td>
    </tr>
    <tr>
      <td></td>
      <td>
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; table-layout: fixed">
          <tr>
            <td style="width: 50px">001</td>
            <td style="width: inherit">Description</td>
            <td style="width: 60px">2</td>
            <td style="width: 70px">100.00</td>
            <td style="width: 90px">200.00</td>
          </tr>
        </table>
      </td>
      <td></td>
    </tr>
  </table>
</div>
```

### delivery_order_test.html（Div 模式）

```html
<div class="printform paper_width" data-papersize-width="750" data-papersize-height="1050" ...>

  <!-- pheader: 直接用 div -->
  <div class="pheader block">
    <h1>Delivery Order</h1>
    <small>DO-2026-0137</small>
  </div>

  <!-- pdocinfo: 直接用 div -->
  <div class="pdocinfo block grid">
    <div><b>Ship To:</b> Sunrise Retail</div>
    <div><b>Date:</b> 2026-02-03</div>
  </div>

  <!-- prowheader: div 包裹 table -->
  <div class="prowheader rowheader">
    <table>
      <tr><th>No.</th><th>Description</th><th>Qty</th></tr>
    </table>
  </div>

  <!-- prowitem: div 包裹 table -->
  <div class="prowitem">
    <table>
      <tr><td>1</td><td>Widget A</td><td>10</td></tr>
    </table>
  </div>
</div>
```

---

## 3. PrintForm.js 分页算法核心

从 `printform.js` 源码分析:

```
对每个 prowitem:
  1. 如果是页面第一行 (currentHeight === 0):
     - 添加 pheader + pdocinfo + prowheader（如果配置了重复）
     - 测量容器高度 → currentHeight
  2. 尝试将 prowitem 添加到容器
  3. 测量容器新高度 → measuredHeight
  4. 如果 measuredHeight <= pageHeight:
     - 保留这行
  5. 如果 measuredHeight > pageHeight:
     - 移除这行
     - 创建新页 (prepareNextPage)
     - 将这行添加到新页
```

**"每页只有1行"的根本原因：**
如果 `pheader + pdocinfo + prowheader + pfooter + 单个prowitem` 的总高度已经接近 pageHeight，
那么加第二个 prowitem 就会超出，导致每页只放 1 行。

---

## 4. 我们模板的具体问题

当前 `templates.ts` 的 section 结构是正确的，可以正常工作。
实测 live test 显示分页正常（4 页 25 行），但之前的 screenshot 显示过的
"每页只有1行"问题可能来自 AI agent 修改后的代码。

**关键注意点：**
- AI agent 修改代码时可能破坏 section 结构
- Feedback Controller 应检查分页后每页的 prowitem 数量
- 如果 pheader/pdocinfo 高度占用过多，应减小这些 section 的尺寸

---

## 5. 规则修正

### 放宽的规则

1. Section 元素类型：`<div>` 和 `<table>` 都允许
2. 列宽方式：`<colgroup>` 和 `<td width>` 都允许
3. 3-col page-frame：推荐但不强制
4. `<style>` 块：允许用于 CSS class 和 @media print

### 保留的规则（确认正确）

1. 每个 prowitem **必须**是独立元素（一行一个）
2. prowheader 存在时**必须**有至少一个 prowitem
3. data-papersize-width/height **必须**是纯数字（无 px 后缀）
4. 页码用 `<span data-page-number>` 和 `<span data-page-total>`
5. 所有 section 的 class name 必须精确匹配（pheader, pdocinfo, prowheader, prowitem, pfooter_pagenum）
6. root 必须是 `<div class="printform">`
7. `_processed` 变体的 CSS 必须同时覆盖

### 新增规则

1. 如果使用 CSS class 样式，**必须**同时定义原始和 `_processed` 变体
2. `data-repeat-docinfo` 默认是 `"y"`，如果不想重复必须显式设 `"n"`
3. 参考模板用 `width: inherit`（不是 `auto`）作为中间列宽
