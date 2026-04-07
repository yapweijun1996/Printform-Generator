const buildProwItems = (count: number) => {
  const items = Array.from({ length: count }, (_, idx) => {
    const rowNo = idx + 1;
    const sku = `SKU-${String(rowNo).padStart(3, '0')}`;
    const qty = ((rowNo % 5) + 1).toString();
    const unit = (10 + (rowNo % 7) * 2 + (rowNo % 3) * 0.5).toFixed(2);
    const amount = (Number(qty) * Number(unit)).toFixed(2);
    return `
  <table class="prowitem" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
    <colgroup>
      <col style="width:15px">
      <col style="width:auto">
      <col style="width:15px">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box;"></td>
      <td style="box-sizing:border-box; vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed; border-bottom:1px solid #e5e7eb;">
          <colgroup>
            <col style="width:18%">
            <col style="width:46%">
            <col style="width:10%">
            <col style="width:13%">
            <col style="width:13%">
          </colgroup>
          <tr>
            <td style="box-sizing:border-box; padding:6px 6px; vertical-align:top;">${sku}</td>
            <td style="box-sizing:border-box; padding:6px 6px; vertical-align:top;">Item ${rowNo} - Standard Line</td>
            <td style="box-sizing:border-box; padding:6px 6px; text-align:right; vertical-align:top;">${qty}</td>
            <td style="box-sizing:border-box; padding:6px 6px; text-align:right; vertical-align:top;">${unit}</td>
            <td style="box-sizing:border-box; padding:6px 6px; text-align:right; vertical-align:top;">${amount}</td>
          </tr>
        </table>
      </td>
      <td style="box-sizing:border-box;"></td>
    </tr>
  </table>`;
  });
  return items.join('\n');
};

const buildInitialHtml = (params: { pageWidthPx: number; pageHeightPx: number; rowCount: number }) => {
  const { pageWidthPx, pageHeightPx, rowCount } = params;
  return `
<div class="printform"
  data-papersize-width="${pageWidthPx}"
  data-papersize-height="${pageHeightPx}"
  data-repeat-header="y"
  data-repeat-docinfo="y"
  data-repeat-rowheader="y"
  data-repeat-footer-pagenum="y"
  data-insert-footer-spacer-while-format-table="y"
  data-insert-dummy-row-item-while-format-table="y"
  style="width:${pageWidthPx}px; min-height:${pageHeightPx}px; margin:0 auto; box-sizing:border-box; padding:0; background:white; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#0f172a; font-size:9pt; line-height:1.3;">

  <!-- Header -->
  <table class="pheader" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
    <colgroup>
      <col style="width:15px">
      <col style="width:auto">
      <col style="width:15px">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box;"></td>
      <td style="box-sizing:border-box; vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
          <colgroup>
            <col style="width:60%">
            <col style="width:40%">
          </colgroup>
          <tr>
            <td style="box-sizing:border-box; padding:10px 6px; vertical-align:top;">
              <span style="font-weight:700; font-size:12pt;">Acme Solutions Inc.</span><br/>
              <span style="color:#64748b;">123 Business Park, Innovation Way</span><br/>
              <span style="color:#64748b;">Tech City, TC 94000</span><br/>
              <span style="color:#64748b;">support@acme.com</span>
            </td>
            <td style="box-sizing:border-box; padding:10px 6px; vertical-align:top; text-align:right;">
              <span style="font-weight:800; font-size:14pt; letter-spacing:0.5px;">INVOICE</span><br/>
              <span style="color:#64748b;">Invoice #: INV-2026-001</span><br/>
              <span style="color:#64748b;">Date: 2026-01-24</span>
            </td>
          </tr>
        </table>
      </td>
      <td style="box-sizing:border-box;"></td>
    </tr>
  </table>

  <!-- Doc Info -->
  <table class="pdocinfo" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
    <colgroup>
      <col style="width:15px">
      <col style="width:auto">
      <col style="width:15px">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box;"></td>
      <td style="box-sizing:border-box; vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed; margin-top:6px;">
          <colgroup>
            <col style="width:48%">
            <col style="width:4%">
            <col style="width:48%">
          </colgroup>
          <tr>
            <td style="box-sizing:border-box; padding:8px 6px; vertical-align:top; border:1px solid #e5e7eb;">
              <span style="font-weight:700;">Bill To</span><br/>
              Global Trade Corp<br/>
              Attn: Purchasing Dept<br/>
              456 Market St, Suite 200<br/>
              San Francisco, CA 94105
            </td>
            <td style="box-sizing:border-box;"></td>
            <td style="box-sizing:border-box; padding:8px 6px; vertical-align:top; border:1px solid #e5e7eb;">
              <span style="font-weight:700;">Ship To</span><br/>
              Global Trade Warehouse<br/>
              Dock 4B<br/>
              789 Logistics Blvd<br/>
              Oakland, CA 94607
            </td>
          </tr>
        </table>
      </td>
      <td style="box-sizing:border-box;"></td>
    </tr>
  </table>

  <!-- Row Header -->
  <table class="prowheader" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
    <colgroup>
      <col style="width:15px">
      <col style="width:auto">
      <col style="width:15px">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box;"></td>
      <td style="box-sizing:border-box; vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed; margin-top:8px; border-bottom:2px solid #0f172a;">
          <colgroup>
            <col style="width:18%">
            <col style="width:46%">
            <col style="width:10%">
            <col style="width:13%">
            <col style="width:13%">
          </colgroup>
          <tr style="background:#f1f5f9;">
            <td style="box-sizing:border-box; padding:7px 6px; font-weight:700;">Item</td>
            <td style="box-sizing:border-box; padding:7px 6px; font-weight:700;">Description</td>
            <td style="box-sizing:border-box; padding:7px 6px; font-weight:700; text-align:right;">Qty</td>
            <td style="box-sizing:border-box; padding:7px 6px; font-weight:700; text-align:right;">Unit</td>
            <td style="box-sizing:border-box; padding:7px 6px; font-weight:700; text-align:right;">Amount</td>
          </tr>
        </table>
      </td>
      <td style="box-sizing:border-box;"></td>
    </tr>
  </table>

  <!-- Row Items (one item per .prowitem table) -->
${buildProwItems(rowCount)}

  <!-- Page Footer -->
  <table class="pfooter_pagenum" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
    <colgroup>
      <col style="width:15px">
      <col style="width:auto">
      <col style="width:15px">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box;"></td>
      <td style="box-sizing:border-box; text-align:center; padding:10px 0; color:#64748b; font-size:8pt;">
        Page <span data-page-number></span> of <span data-page-total></span>
      </td>
      <td style="box-sizing:border-box;"></td>
    </tr>
  </table>
</div>`;
};

export const INITIAL_HTML = buildInitialHtml({ pageWidthPx: 750, pageHeightPx: 1050, rowCount: 25 });
