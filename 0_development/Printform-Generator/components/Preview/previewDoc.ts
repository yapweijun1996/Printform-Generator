interface PreviewDocInput {
  safeHtmlContent: string;
  pageWidthPx: number;
  pageHeightPx: number;
  baseHref: string;
  printformScriptUrl: string;
}

export const getHtml2canvasScriptUrl = (baseHref: string) => {
  try {
    return new URL('html2canvas.min.js', baseHref).toString();
  } catch {
    return './html2canvas.min.js';
  }
};

export const buildPreviewSrcDoc = ({
  safeHtmlContent,
  pageWidthPx,
  pageHeightPx,
  baseHref,
  printformScriptUrl,
}: PreviewDocInput) => {
  const html2canvasUrl = getHtml2canvasScriptUrl(baseHref);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      <base href="${baseHref}" />
      <style>
        html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { background-color: white; font-family: sans-serif; }
        @media print {
          @page { margin: 0; size: auto; }
          body { margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
      <script src="${printformScriptUrl}"></script>
      <script src="${html2canvasUrl}"></script>
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
                el.style.minHeight = '';
                el.style.margin = '0';
                el.style.boxSizing = 'border-box';
              } catch (e) {}
            });
          }

          function measureFormattedHeight() {
            var formatter = document.querySelector('.printform_formatter_processed, .printform_formatter');
            if (formatter) {
              return Math.ceil(formatter.getBoundingClientRect().height || formatter.scrollHeight || 0);
            }

            var pages = Array.prototype.slice.call(document.querySelectorAll('.printform_page'));
            if (pages.length > 0) {
              return pages.reduce(function (sum, page) {
                return sum + Math.ceil(page.getBoundingClientRect().height || page.scrollHeight || 0);
              }, 0);
            }

            var bodyHeight = document.body ? document.body.scrollHeight : 0;
            var htmlHeight = document.documentElement ? document.documentElement.scrollHeight : 0;
            return Math.ceil(htmlHeight || bodyHeight || H);
          }

          function notifyFormatted() {
            try {
              if (window.parent && window.parent !== window) {
                var contentHeight = measureFormattedHeight();
                window.parent.postMessage({ type: 'printform:formatted', contentHeight: contentHeight }, '*');
              }
            } catch (e) {}
          }

          async function captureSnapshot(opts) {
            if (typeof html2canvas === 'undefined') {
              window.parent.postMessage({ type: 'printform:snapshot_error', error: 'html2canvas not loaded' }, '*');
              return;
            }
            try {
              var target =
                document.querySelector('.printform_formatter_processed, .printform_formatter') ||
                document.querySelector('.printform') ||
                document.body ||
                document.documentElement;
              if (!target) throw new Error('No target element');

              var scale = (opts && opts.scale) || 0.6;
              var jpegQuality = (opts && opts.jpegQuality) || 0.65;

              var canvas = await html2canvas(target, {
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: false,
                scale: scale,
                logging: false,
                windowWidth: W,
                windowHeight: H,
              });
              var dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
              var base64 = dataUrl.split(',')[1] || '';
              if (!base64) throw new Error('Empty snapshot data');
              window.parent.postMessage({
                type: 'printform:snapshot_result',
                mimeType: 'image/jpeg',
                data: base64,
              }, '*');
            } catch (e) {
              window.parent.postMessage({
                type: 'printform:snapshot_error',
                error: (e && e.message) || 'Snapshot capture failed',
              }, '*');
            }
          }

          function handlePrint() {
            try { window.print(); } catch (e) {}
          }

          function getDocumentHtml() {
            try {
              var html = document.documentElement ? document.documentElement.outerHTML : document.body.innerHTML;
              window.parent.postMessage({ type: 'printform:document_html', html: html }, '*');
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
              if (ev.data.type === 'printform:capture_snapshot') {
                captureSnapshot(ev.data.opts || {});
              }
              if (ev.data.type === 'printform:print') {
                handlePrint();
              }
              if (ev.data.type === 'printform:get_html') {
                getDocumentHtml();
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
