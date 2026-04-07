# printform-js-generator (Knowledge Pack v1.0)

name: printform-js-generator  
description: "Generate print-ready paginated HTML forms using PrintForm.js: define paper size and structure, configure headers/footers/data rows, handle auto-pagination with dummy rows, test across devices, and produce production-ready printable documents."  
version: "1.0"  
tags: [workflow, sop, frontend, dev, printform, html, testing]

---

## Goal

Create print-ready, auto-paginated HTML forms using PrintForm.js that automatically split long content into multiple pages with repeating headers/footers, table headers, page numbers, and dummy row filling, ready for browser printing or PDF export.

## When to Use

- You need to generate invoices, reports, delivery orders, or any multi-page printable documents from HTML.
- You want automatic pagination that handles headers, footers, and page breaks intelligently.
- You need consistent print output across different browsers and devices (desktop/mobile).
- You want to avoid complex PDF generation libraries and use pure HTML/CSS/JS.

## Inputs

- Document type and content: invoice, report, delivery order, terms & conditions, etc.
- Paper specifications: size (A4/Letter/custom), orientation (portrait/landscape), dimensions in pixels.
- Content structure: header data, document info, table rows/data items, footer content, terms/legal text.
- Pagination requirements: which sections repeat on every page, page numbering, dummy row filling.
- Constraints:
  - Use PrintForm.js library (zero-dependency Vanilla JS).
  - Follow the specific HTML structure convention (`.printform`, `.pheader`, `.prowitem`, etc.).
  - Test on target devices/browsers before production.
  - Do not rely on `data-*` attributes for styling (use class names, including `_processed` variants).

## Output

- A complete HTML file with:
  - Proper `<meta>` viewport settings for mobile compatibility.
  - Structured `.printform` container with all required sections.
  - Configuration via `data-*` attributes on the `.printform` element.
  - Custom styles for headers, footers, rows, and dummy content.
  - PrintForm.js script included and configured.
- Verification checklist results (visual check, print preview, cross-device test).
- Optional: Custom dummy row templates and page-specific styling.

## Procedure

### 1. Set up the HTML document foundation.

- Create HTML5 document with proper `<!DOCTYPE html>` and `<html lang="en">`.
- Add mobile-friendly viewport meta tag:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
/>
```

- Add text-size-adjust CSS to prevent mobile font scaling:

```css
html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
```

- Include PrintForm.js script: `<script src="./dist/printform.js"></script>` (or CDN/local path).

### 2. Define paper size and orientation.

- Determine target paper size (common: A4 = 750×1050px, Letter = 816×1056px).
- Set `data-papersize-width` and `data-papersize-height` on `.printform` container.
- Set `data-orientation` to `portrait` or `landscape` if needed.

### 3. Structure the `.printform` container with required sections.

- Create the root container: `<div class="printform" data-papersize-width="750" data-papersize-height="1050">`.
- Add sections in this order (all optional except `.prowitem` for data):
  - `.pheader` - Header (repeats on every page by default).
  - `.pdocinfo`, `.pdocinfo002`, `.pdocinfo003`, `.pdocinfo004`, `.pdocinfo005` - Document info sections (e.g., invoice number, date, customer details). Use multiple variants for different info blocks.
  - `.prowheader` - Table column headers (repeats on every page by default).
  - `.prowitem` - Data rows (the smallest unit for splitting; content inside won't be split).
  - `.ptac` - Terms and conditions or long text (auto-splits by paragraph into `.ptac-rowitem` segments).
  - `.paddt` - Post-appendix data/text (renders AFTER all footers on separate pages, auto-splits into `.paddt-rowitem` segments).
  - `.pfooter`, `.pfooter002`, `.pfooter003`, `.pfooter004`, `.pfooter005` - Footer sections (default to last page only, configurable to repeat). Use multiple variants for different footer content.
  - `.pfooter_logo` - Footer logo section (separate from main footers).
  - `.pfooter_pagenum` - Footer page number section (use `data-page-number`, `data-page-total` attributes inside for auto-update).

### 4. Configure pagination behavior with `data-*` attributes.

#### Paper & Layout

- `data-papersize-width="750"` - Paper width in pixels.
- `data-papersize-height="1050"` - Paper height in pixels.
- `data-paper-size="A4"` - Named paper size (A4, Letter, etc.). Auto-calculates width/height if not manually set.
- `data-orientation="portrait"` or `"landscape"` - Paper orientation.
- `data-dpi="96"` - DPI for paper size calculations (default: 96).
- `data-n-up="1"` - N-Up printing: number of logical pages per physical sheet (1=normal, 2=two pages per sheet, etc.).

#### Header/Footer Repeat

- `data-repeat-header="y"` - Repeat header on every page (default: `y`).
- `data-repeat-docinfo="y"` - Repeat `.pdocinfo` on every page (default: `y`).
- `data-repeat-docinfo002="y"` - Repeat `.pdocinfo002` on every page (default: `y`).
- `data-repeat-docinfo003="y"` - Repeat `.pdocinfo003` on every page (default: `y`).
- `data-repeat-docinfo004="y"` - Repeat `.pdocinfo004` on every page (default: `y`).
- `data-repeat-docinfo005="y"` - Repeat `.pdocinfo005` on every page (default: `y`).
- `data-repeat-rowheader="y"` - Repeat `.prowheader` on every page (default: `y`).
- `data-repeat-ptac-rowheader="y"` - Repeat `.prowheader` on PTAC pages (default: `y`).
- `data-repeat-footer="n"` - Repeat `.pfooter` on every page (default: `n`, final page always shows all footers).
- `data-repeat-footer002="n"` - Repeat `.pfooter002` on every page (default: `n`).
- `data-repeat-footer003="n"` - Repeat `.pfooter003` on every page (default: `n`).
- `data-repeat-footer004="n"` - Repeat `.pfooter004` on every page (default: `n`).
- `data-repeat-footer005="n"` - Repeat `.pfooter005` on every page (default: `n`).
- `data-repeat-footer-logo="n"` - Repeat `.pfooter_logo` on every page (default: `n`).
- `data-repeat-footer-pagenum="n"` - Repeat `.pfooter_pagenum` on every page (default: `n`).

#### Page Numbers

- `data-show-logical-page-number="y"` - Show logical page numbers (Page 1, 2, 3...) (default: `y`).
- `data-show-physical-page-number="n"` - Show physical page numbers (for N-Up printing) (default: `n`).
- Use `data-page-number`, `data-page-total` attributes in `.pfooter_pagenum` for auto-update.
- Use `data-physical-page-number`, `data-physical-page-total` for physical page numbers.

#### Dummy Rows & Spacing

- `data-insert-dummy-row-item-while-format-table="y"` - Fill empty space with repeated dummy row items (default: `y`).
- `data-height-of-dummy-row-item="18"` - Height of each dummy row item in pixels (default: 18).
- `data-insert-ptac-dummy-row-items="y"` - Insert dummy row items on PTAC pages (default: `y`).
- `data-insert-dummy-row-while-format-table="n"` - Insert a single dummy row block to fill space (default: `n`).
- `data-insert-footer-spacer-while-format-table="y"` - Insert footer spacer to push footers down (default: `y`).
- `data-insert-footer-spacer-with-dummy-row-item-while-format-table="y"` - Use dummy row items as footer spacer (default: `y`).
- `data-fill-page-height-after-footer="y"` - Add final spacer after footer to match page height (default: `y`).

#### PADDT (Post-Appendix Data/Text)

- `data-repeat-paddt-rowheader="y"` - Repeat `.prowheader` on PADDT pages (default: `y`).
- `data-insert-paddt-dummy-row-items="y"` - Insert dummy row items on PADDT pages (default: `y`).
- `data-paddt-max-words-per-segment="200"` - Max words per PADDT segment when splitting paragraphs (default: 200).
- `data-repeat-paddt-docinfo="y"` - Repeat `.pdocinfo` on PADDT pages (default: `y`).
- `data-repeat-paddt-docinfo002="y"` - Repeat `.pdocinfo002` on PADDT pages (default: `y`).
- `data-repeat-paddt-docinfo003="y"` - Repeat `.pdocinfo003` on PADDT pages (default: `y`).
- `data-repeat-paddt-docinfo004="y"` - Repeat `.pdocinfo004` on PADDT pages (default: `y`).
- `data-repeat-paddt-docinfo005="y"` - Repeat `.pdocinfo005` on PADDT pages (default: `y`).
- `data-paddt-debug="n"` - Enable PADDT-specific debug logs (default: `n`).

#### Debug & Advanced

- `data-debug="n"` - Enable debug mode with detailed console logs (default: `n`).
- `data-div-page-break-before-class-append="custom_class"` - Append custom class(es) to page break dividers.

For full config reference, see PrintForm.js documentation or `config.js` source.

### 5. Style the sections (use class names, not `data-*` attributes).

- Critical: During formatting, PrintForm.js renames classes for both the container and its sections:
  - Container: `.printform` → `.printform_formatter_processed`
  - Sections: `.pheader` → `.pheader_processed`, `.prowitem` → `.prowitem_processed`, etc.
- Always style both original and `_processed` class names:

```css
/* Container styles */
.printform,
.printform_formatter_processed {
  /* container styles */
}

/* Section styles */
.pheader,
.pheader_processed {
  /* header styles */
}
.prowitem,
.prowitem_processed {
  /* row styles */
}
.pfooter,
.pfooter_processed {
  /* footer styles */
}

/* CRITICAL: Preserve background colors when printing (Chrome/Firefox) */
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

### 6. Add page-specific styling if needed.

- PrintForm.js adds `.printform_page_1`, `.printform_page_2`, etc., to each page container.
- Use these for page-specific rules (e.g., hide header on first page).

### 7. Control pagination behavior with special class names.

- Force page break: add `tb_page_break_before` class to a `.prowitem` to force it to start on a new page.
- Skip row header on specific page: add `without_prowheader` or `tb_without_rowheader` class.

### 8. Understand PADDT (Post-Appendix Data/Text) workflow.

- PADDT content (`.paddt`) renders AFTER all regular footers on separate pages.
- PADDT automatically splits long paragraphs into segments based on `data-paddt-max-words-per-segment`.

### 9. Customize dummy rows (optional).

You can provide a custom dummy row template:

```html
<template class="custom-dummy-row-item-content">
  <tr style="height:20px;">
    <td style="border:0;">&nbsp;</td>
  </tr>
</template>
```

### 10. Enable debug mode for development.

- Set `data-debug="y"` on `.printform` to enable detailed console logs.
- Use `data-paddt-debug="y"` for PADDT-specific debug logs.

### 11. Handle dynamic content (if applicable).

If content is loaded dynamically, trigger formatting manually:

```js
PrintForm.formatAll();
// or
PrintForm.format(document.querySelector('#invoice-1'));
```

### 12. Test and verify across devices and browsers.

- Visual check: use a local server (not `file://`).
- Print preview (Cmd+P / Ctrl+P).
- Mobile + cross-browser testing.
- Print to PDF verification.

### 13. Optimize for production.

Minify if needed, ensure assets accessible, add `@media print` as needed, enable Background graphics.

### 14. Document usage and edge cases.

Record paper size, repeat sections, dummy row strategy, page-specific rules, known limitations.

## Verification (Acceptance Checks)

- [ ] HTML includes viewport meta tag and text-size-adjust CSS.
- [ ] `.printform` has correct `data-papersize-width` / `data-papersize-height`.
- [ ] Required sections are present and correctly structured.
- [ ] Styles target both original and `_processed` class names.
- [ ] CSS includes `print-color-adjust: exact`.
- [ ] Print preview shows correct pagination without overlap.
- [ ] Repeating header/footer/row header works on multi-page documents.
- [ ] Page numbers render correctly if enabled.
- [ ] Dummy rows fill empty space appropriately.
- [ ] Renders correctly across target devices/browsers.
- [ ] PDF export produces clean output.
- [ ] PADDT appears after regular footers (if used).
- [ ] Forced page breaks work (if used).
- [ ] Debug logs are available without errors (if used).
- [ ] N-Up works (if used).

## Failure Modes & Recovery

See the original knowledge pack for the full list of failure modes and recovery steps (cut-off content, missing repeats, dummy row issues, print colors missing, processed class styling, PADDT issues, forced breaks, mobile quirks, dynamic content, debug mode, N-Up).
