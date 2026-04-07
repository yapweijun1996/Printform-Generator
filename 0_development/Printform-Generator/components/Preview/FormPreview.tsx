import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [contentHeight, setContentHeight] = useState(0);
  const captureTimerRef = useRef<number | null>(null);
  const captureOptionsRef = useRef<{ scale: number; jpegQuality: number } | null>(null);
  const documentHtmlResolveRef = useRef<((html: string) => void) | null>(null);

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

  const postToIframe = (message: Record<string, unknown>) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(message, '*');
    } catch (_e) {
      // cross-origin postMessage is fine, contentWindow access for postMessage is allowed
    }
  };

  const requestDocumentHtml = (): Promise<string> => {
    return new Promise((resolve) => {
      documentHtmlResolveRef.current = resolve;
      postToIframe({ type: 'printform:get_html' });
      // Timeout fallback
      setTimeout(() => {
        if (documentHtmlResolveRef.current === resolve) {
          documentHtmlResolveRef.current = null;
          resolve('');
        }
      }, 2000);
    });
  };

  const handlePrint = async () => {
    // First try: ask the iframe to print itself
    postToIframe({ type: 'printform:print' });

    // Give the iframe a moment; if it doesn't work (e.g. browser blocks),
    // fallback to popup print using the iframe's HTML via postMessage.
    const html = await requestDocumentHtml();
    if (!html) return;

    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      alert('Print popup was blocked by the browser. Please allow popups for this site and try again.');
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>${html}`);
    win.document.close();

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

  const requestSnapshot = useCallback(() => {
    if (!onPreviewSnapshot) return;

    const opts = captureOptionsRef.current;
    const scale = opts?.scale ?? 0.6;
    const jpegQuality = opts?.jpegQuality ?? 0.65;
    captureOptionsRef.current = null;

    postToIframe({ type: 'printform:capture_snapshot', opts: { scale, jpegQuality } });
  }, [onPreviewSnapshot]);

  const scheduleCapture = useCallback(() => {
    if (!onPreviewSnapshot) return;
    if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    captureTimerRef.current = window.setTimeout(() => {
      requestSnapshot();
    }, 200);
  }, [requestSnapshot, onPreviewSnapshot]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      if (event.source !== win) return;

      const data = event?.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'printform:formatted') {
        const h = data.contentHeight;
        if (typeof h === 'number' && h > 0) setContentHeight(h);
        scheduleCapture();
      }

      if (data.type === 'printform:snapshot_result' && onPreviewSnapshot) {
        onPreviewSnapshot({ mimeType: data.mimeType, data: data.data });
      }

      if (data.type === 'printform:snapshot_error' && onPreviewSnapshotError) {
        onPreviewSnapshotError(data.error || 'Snapshot capture failed');
      }

      if (data.type === 'printform:document_html' && documentHtmlResolveRef.current) {
        documentHtmlResolveRef.current(data.html || '');
        documentHtmlResolveRef.current = null;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [scheduleCapture, onPreviewSnapshot, onPreviewSnapshotError]);

  // Allow non-React callers (e.g., agent flow) to request a fresh snapshot on-demand.
  useEffect(() => {
    const requestHandler = (event: CustomEvent<{ scale?: number; jpegQuality?: number }>) => {
      const scale = Number.isFinite(event?.detail?.scale) ? Number(event.detail.scale) : undefined;
      const jpegQuality = Number.isFinite(event?.detail?.jpegQuality) ? Number(event.detail.jpegQuality) : undefined;
      if (scale || jpegQuality) {
        captureOptionsRef.current = {
          scale: typeof scale === 'number' ? Math.max(0.2, Math.min(3, scale)) : 0.6,
          jpegQuality: typeof jpegQuality === 'number' ? Math.max(0.1, Math.min(0.95, jpegQuality)) : 0.65,
        };
      }
      postToIframe({ type: 'printform:format_now' });
    };
    window.addEventListener('formpreview:request_snapshot', requestHandler as any);
    return () => window.removeEventListener('formpreview:request_snapshot', requestHandler as any);
  }, []);

  useEffect(() => {
    return () => {
      if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    };
  }, []);

  // Use actual content height from PrintForm.js (multi-page), fallback to configured page height
  const actualHeight = contentHeight > 0 ? contentHeight : parseDim(pageHeight);
  const scaledWidth = parseDim(pageWidth) * zoom;
  const scaledHeight = actualHeight * zoom;

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

      {/* Canvas Area — scrollable to show all pages */}
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
              width: parseDim(pageWidth),
              height: actualHeight,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
            className="bg-white"
          >
            <iframe
              ref={iframeRef}
              title="Form Preview"
              className="w-full h-full border-none block"
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-modals"
              onLoad={scheduleCapture}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormPreview;
