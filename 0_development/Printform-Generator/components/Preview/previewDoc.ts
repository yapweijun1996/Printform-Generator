interface PreviewDocInput {
  safeHtmlContent: string;
  pageWidthPx: number;
  pageHeightPx: number;
  baseHref: string;
  printformScriptUrl: string;
}

export const buildPreviewSrcDoc = ({
  safeHtmlContent,
  pageWidthPx,
  pageHeightPx,
  baseHref,
  printformScriptUrl,
}: PreviewDocInput) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <base href="${baseHref}" />
      <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { background-color: white; font-family: sans-serif; }
        @media screen { body { padding: 10px; display: flex; justify-content: center; } }
        @media print {
          @page { margin: 0; size: auto; }
          body { margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
      <script src="${printformScriptUrl}"></script>
      <script>
        (function () {
          var W = ${pageWidthPx};
          var H = ${pageHeightPx};

          function applyConfig() {
            var forms = Array.prototype.slice.call(document.querySelectorAll('.printform'));
            forms.forEach(function (el) {
              try {
                el.dataset.papersizeWidth = String(W);
                el.dataset.papersizeHeight = String(H);
                el.style.width = W + 'px';
                el.style.minHeight = H + 'px';
                el.style.margin = '0 auto';
                el.style.boxSizing = 'border-box';
              } catch (e) {}
            });
          }

          function notifyFormatted() {
            try {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'printform:formatted' }, '*');
              }
            } catch (e) {}
          }

          async function formatNow() {
            try {
              applyConfig();
              if (window.PrintForm && typeof window.PrintForm.formatAll === 'function') {
                await window.PrintForm.formatAll({
                  force: true,
                  papersizeWidth: W,
                  papersizeHeight: H,
                });
              }
            } catch (e) {
              // ignore and still notify
            } finally {
              notifyFormatted();
            }
          }

          window.addEventListener('load', function () {
            setTimeout(formatNow, 0);
          });

          window.addEventListener('message', function (ev) {
            try {
              if (!ev || !ev.data) return;
              if (ev.data.type === 'printform:format_now') {
                setTimeout(formatNow, 0);
              }
            } catch (e) {}
          });
        })();
      </script>
    </head>
    <body>
      ${safeHtmlContent}
    </body>
    </html>
  `;
};
