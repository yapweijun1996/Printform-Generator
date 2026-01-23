export const INITIAL_HTML = `
<div class="printform" style="box-sizing: border-box; padding: 20px; width: 750px; margin: 0 auto; background: white; font-family: 'Inter', sans-serif; color: #1e293b; font-size: 9pt; line-height: 1.3;">
  
  <!-- 
    STRICT TABLE RULE: 
    Always use: cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed;" border="0"
    Always use: <colgroup> for widths
    Always use: Inline styles (style="") instead of classes for email/ERP compatibility
  -->

  <!-- 1. HEADER SECTION -->
  <table cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed;" border="0">
    <colgroup>
        <col style="width: 60%">
        <col style="width: 40%">
    </colgroup>
    <tr>
      <!-- Left: Logo & Company -->
      <td style="box-sizing:border-box; vertical-align:top; padding-bottom:20px;">
        <img src="https://placehold.co/150x40/3b82f6/white?text=COMPANY+LOGO" alt="Logo" style="display:block; margin-bottom:10px;" />
        <div style="font-weight:600; font-size:16px;">Acme Solutions Inc.</div>
        <div style="font-size:10px; color:#64748b; line-height:1.4;">
          123 Business Park, Innovation Way<br>
          Tech City, TC 94000<br>
          support@acme.com
        </div>
      </td>
      
      <!-- Right: Document Meta -->
      <td style="box-sizing:border-box; vertical-align:top; text-align:right; padding-bottom:20px;">
        <div style="font-size:24px; text-transform:uppercase; letter-spacing:1px; color:#0f172a;">Invoice</div>
        <div style="font-size:10px; color:#64748b; margin-top:5px;">Original Copy</div>
        <br>
        <table cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed;" border="0">
          <colgroup>
            <col style="width: 60%">
            <col style="width: 40%">
          </colgroup>
          <tr>
            <td style="box-sizing:border-box; text-align:right; padding:2px; font-size:10px; color:#64748b;">Invoice #:</td>
            <td style="box-sizing:border-box; text-align:right; padding:2px; font-weight:600; font-size:12px;">INV-2024-001</td>
          </tr>
          <tr>
            <td style="box-sizing:border-box; text-align:right; padding:2px; font-size:10px; color:#64748b;">Date:</td>
            <td style="box-sizing:border-box; text-align:right; padding:2px; font-weight:600; font-size:12px;">Oct 24, 2024</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- 2. BILL TO / SHIP TO -->
  <table cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed; margin-top:20px; margin-bottom:30px;" border="0">
    <colgroup>
        <col style="width: 48%">
        <col style="width: 4%">
        <col style="width: 48%">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box; vertical-align:top; padding:10px; background-color:#f8fafc; border-radius:4px;">
        <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; mb:4px;">Bill To:</div>
        <div style="font-weight:600; font-size:12px;">Global Trade Corp</div>
        <div style="font-size:10px; color:#64748b; margin-top:4px;">
          Attn: Purchasing Dept<br>
          456 Market St, Suite 200<br>
          San Francisco, CA 94105
        </div>
      </td>
      <td style="box-sizing:border-box;"></td> <!-- Spacer -->
      <td style="box-sizing:border-box; vertical-align:top; padding:10px; border:1px dashed #cbd5e1; border-radius:4px;">
        <div style="font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; mb:4px;">Ship To:</div>
        <div style="font-weight:600; font-size:12px;">Global Trade Warehouse</div>
        <div style="font-size:10px; color:#64748b; margin-top:4px;">
          Dock 4B<br>
          789 Logistics Blvd<br>
          Oakland, CA 94607
        </div>
      </td>
    </tr>
  </table>

  <!-- 3. LINE ITEMS -->
  <!-- Row Item Header (separate table) -->
  <table class="rowitem-header" cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed; border-bottom:2px solid #e2e8f0;" border="0">
    <colgroup>
        <col style="width: 45%">
        <col style="width: 15%">
        <col style="width: 20%">
        <col style="width: 20%">
    </colgroup>
    <tr style="background-color:#f8fafc; font-weight:600; font-size:11px; text-transform:uppercase; color:#475569;">
      <td style="box-sizing:border-box; padding:10px 5px;">Description</td>
      <td style="box-sizing:border-box; padding:10px 5px; text-align:center;">Qty</td>
      <td style="box-sizing:border-box; padding:10px 5px; text-align:right;">Unit Price</td>
      <td style="box-sizing:border-box; padding:10px 5px; text-align:right;">Total</td>
    </tr>
  </table>

  <!-- Row Item 1 (one item per table) -->
  <table class="rowitem" cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed; border-bottom:1px solid #f1f5f9;" border="0">
    <colgroup>
        <col style="width: 45%">
        <col style="width: 15%">
        <col style="width: 20%">
        <col style="width: 20%">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box; padding:12px 5px; vertical-align:top;">
        <div style="font-weight:600; font-size:12px;">Premium Software License</div>
        <div style="font-size:10px; color:#64748b;">Annual subscription (User Tier 1)</div>
      </td>
      <td style="box-sizing:border-box; padding:12px 5px; text-align:center; vertical-align:top; font-size:12px;">5</td>
      <td style="box-sizing:border-box; padding:12px 5px; text-align:right; vertical-align:top; font-size:12px;">$120.00</td>
      <td style="box-sizing:border-box; padding:12px 5px; text-align:right; vertical-align:top; font-size:12px;">$600.00</td>
    </tr>
  </table>

  <!-- Row Item 2 (one item per table) -->
  <table class="rowitem" cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed; border-bottom:1px solid #f1f5f9;" border="0">
    <colgroup>
        <col style="width: 45%">
        <col style="width: 15%">
        <col style="width: 20%">
        <col style="width: 20%">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box; padding:12px 5px; vertical-align:top;">
        <div style="font-weight:600; font-size:12px;">Implementation Support</div>
        <div style="font-size:10px; color:#64748b;">On-site technical assistance (Hours)</div>
      </td>
      <td style="box-sizing:border-box; padding:12px 5px; text-align:center; vertical-align:top; font-size:12px;">10</td>
      <td style="box-sizing:border-box; padding:12px 5px; text-align:right; vertical-align:top; font-size:12px;">$85.00</td>
      <td style="box-sizing:border-box; padding:12px 5px; text-align:right; vertical-align:top; font-size:12px;">$850.00</td>
    </tr>
  </table>

  <!-- 5. TOTALS -->
  <table cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed; margin-top:20px;" border="0">
    <colgroup>
        <col style="width: 60%">
        <col style="width: 40%">
    </colgroup>
    <tr>
      <td style="box-sizing:border-box;"></td>
      <td style="box-sizing:border-box;">
        <table cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed;" border="0">
          <colgroup>
             <col style="width: 50%">
             <col style="width: 50%">
          </colgroup>
          <tr>
            <td style="box-sizing:border-box; text-align:right; padding:5px; font-weight:600; color:#64748b; font-size:12px;">Subtotal:</td>
            <td style="box-sizing:border-box; text-align:right; padding:5px; font-size:12px;">$1,450.00</td>
          </tr>
          <tr>
            <td style="box-sizing:border-box; text-align:right; padding:5px; font-weight:600; color:#64748b; font-size:12px;">Tax (10%):</td>
            <td style="box-sizing:border-box; text-align:right; padding:5px; font-size:12px;">$145.00</td>
          </tr>
          <tr>
             <td colspan="2" style="padding:10px 0;">
                <div style="border-top:2px solid #0f172a;"></div>
             </td>
          </tr>
          <tr>
            <td style="box-sizing:border-box; text-align:right; padding:5px; font-size:16px; font-weight:700;">Total Due:</td>
            <td style="box-sizing:border-box; text-align:right; padding:5px; font-size:16px; font-weight:700; color:#0f172a;">$1,595.00</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- 6. FOOTER -->
  <table cellpadding="0" cellspacing="0" style="width:100%; table-layout:fixed; margin-top:50px; border-top:1px solid #e2e8f0;" border="0">
    <colgroup><col style="width: 100%"></colgroup>
    <tr>
      <td style="box-sizing:border-box; padding:15px; text-align:center; color:#94a3b8; font-size:10px;">
        Thank you for your business. Please make checks payable to Acme Solutions Inc.<br>
        Page 1 of 1
      </td>
    </tr>
  </table>
</div>`;
