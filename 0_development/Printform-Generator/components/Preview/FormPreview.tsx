import React, { useCallback, useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import PreviewToolbar from './PreviewToolbar';
import { buildPreviewSrcDoc } from './previewDoc';
import { getBaseHref, getPrintformScriptUrl } from './previewUrl';

interface FormPreviewProps {
  htmlContent: string;
  pageWidth?: string;
  pageHeight?: string;
  onPreviewSnapshot?: (image: { mimeType: string; data: string }) => void;
  onPreviewSnapshotError?: (reason: string) => void;
}

const FormPreview: React.FC<FormPreviewProps> = ({
  htmlContent,
  pageWidth = '750px',
  pageHeight = '1050px',
  onPreviewSnapshot,
  onPreviewSnapshotError,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(0.65);
  const captureTimerRef = useRef<number | null>(null);
  const captureInFlightRef = useRef(false);

  const sanitizeForPrint = (html: string) => {
    if (!html) return '';
    // Best-effort client-side hardening: strip scripts and inline event handlers.
    return html
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+="[^"]*"/gi, '')
      .replace(/\son\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  };

  const safeHtmlContent =
    sanitizeForPrint(htmlContent) ||
    '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#ccc;">Generating Form...</div>';

  const configuredWidthPx = Number.parseInt(pageWidth, 10) || 800;
  const configuredHeightPx = Number.parseInt(pageHeight, 10) || 800;
  const baseHref = getBaseHref();
  const printformScriptUrl = getPrintformScriptUrl(baseHref);
  const srcDoc = buildPreviewSrcDoc({
    safeHtmlContent,
    pageWidthPx: configuredWidthPx,
    pageHeightPx: configuredHeightPx,
    baseHref,
    printformScriptUrl,
  });

  const handlePrint = () => {
    // Some browsers block printing from sandboxed iframes even with allow-same-origin.
    // Strategy: try iframe print first; fallback to a popup print window.
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {
        console.error(e);
      }
    }

    // Fallback: print via new window (user-initiated click => popup generally allowed).
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      alert('Print popup was blocked by the browser. Please allow popups for this site and try again.');
      return;
    }

    const safeHtml = safeHtmlContent || '<div style="padding:20px;color:#999;">No content to print.</div>';
    win.document.open();
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Print</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
          html, body { margin: 0; padding: 0; width: 100%; }
          body { background-color: white; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
          @media print {
            @page { margin: 0; size: auto; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${safeHtml}
      </body>
      </html>
    `);
    win.document.close();

    // Ensure layout/fonts resolve before printing
    win.focus();
    setTimeout(() => {
      try {
        win.print();
        win.close();
      } catch (e) {
        console.error(e);
        alert('Print failed. Please try again.');
      }
    }, 250);
  };

  // Helper to get raw numeric value if pixel for approximate outer container sizing
  const parseDim = (dim: string) => parseInt(dim) || 800;

  const capturePreviewSnapshot = useCallback(async () => {
    if (!onPreviewSnapshot) return;
    if (captureInFlightRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;

    try {
      captureInFlightRef.current = true;
      const target =
        (doc.querySelector('.printform') as HTMLElement | null) ||
        (doc.body as HTMLElement | null) ||
        (doc.documentElement as HTMLElement | null);

      if (!target) return;

      const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        scale: 0.6,
        logging: false,
        windowWidth: parseDim(pageWidth),
        windowHeight: parseDim(pageHeight),
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
      const base64 = dataUrl.split(',')[1] || '';
      if (!base64) throw new Error('Empty snapshot data');

      onPreviewSnapshot({ mimeType: 'image/jpeg', data: base64 });
    } catch (e: any) {
      console.warn('Preview snapshot capture failed:', e);
      onPreviewSnapshotError?.(e?.message || 'Preview snapshot capture failed.');
    } finally {
      captureInFlightRef.current = false;
    }
  }, [onPreviewSnapshot, onPreviewSnapshotError, pageHeight, pageWidth]);

  const scheduleCapture = useCallback(() => {
    if (!onPreviewSnapshot) return;
    if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => {
      capturePreviewSnapshot();
    }, 200);
  }, [capturePreviewSnapshot, onPreviewSnapshot]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      if (event.source !== win) return;
      if ((event as any)?.data?.type === 'printform:formatted') {
        scheduleCapture();
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [scheduleCapture]);

  // Allow non-React callers (e.g., agent flow) to request a fresh snapshot on-demand.
  useEffect(() => {
    const requestHandler = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage({ type: 'printform:format_now' }, '*');
      } catch (_e) {
        // ignore
      }
    };
    window.addEventListener('formpreview:request_snapshot', requestHandler as any);
    return () => window.removeEventListener('formpreview:request_snapshot', requestHandler as any);
  }, []);

  useEffect(() => {
    return () => {
      if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    };
  }, []);

  // We use CSS transforms to scale the "Page" while keeping its internal dimensions intact
  // The outer wrapper reserves the visual space for the scaled page
  const scaledWidth = parseDim(pageWidth) * zoom;
  const scaledHeight = parseDim(pageHeight) * zoom;

  // If units are not pixels, this calculation might be off visually in the scroll container,
  // but the iframe transform itself will handle the content scaling correctly.
  // For '750px' standard, this works perfectly.

  return (
    <div className="flex flex-col h-full bg-erp-200">
      <PreviewToolbar
        zoom={zoom}
        onZoomOut={() => setZoom(Math.max(0.25, zoom - 0.1))}
        onZoomIn={() => setZoom(Math.min(2.5, zoom + 0.1))}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        onPrint={handlePrint}
      />

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-200/90 relative flex justify-center p-8">
        <div
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
          className="relative transition-all duration-200 ease-out flex-none shadow-2xl ring-1 ring-black/5"
        >
          <div
            style={{
              width: pageWidth,
              height: pageHeight,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
            className="bg-white overflow-hidden"
          >
            <iframe
              ref={iframeRef}
              title="Form Preview"
              className="w-full h-full border-none block"
              srcDoc={srcDoc}
              // Allow scripts for dynamic content, same-origin for printing, and modals for print dialogs
              sandbox="allow-scripts allow-same-origin allow-modals"
              onLoad={scheduleCapture}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreview;
