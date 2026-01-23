
import React, { useEffect, useRef, useState } from 'react';

interface FormPreviewProps {
  htmlContent: string;
  pageWidth?: string;
  pageHeight?: string;
}

const FormPreview: React.FC<FormPreviewProps> = ({ htmlContent, pageWidth = '750px', pageHeight = '1050px' }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(0.65);

  // Inject styles and content into iframe
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        // We wrap the content to ensure standard print resets AND isolation
        // The @media print block specifically hides everything that isn't the .printform
        const enrichedContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              /* Core Print Reset */
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
              body { background-color: white; font-family: sans-serif; }
              
              /* PREVIEW ONLY STYLES */
              @media screen {
                 body { padding: 10px; display: flex; justify-content: center; }
              }

              /* PRINT STYLES */
              @media print {
                 @page { margin: 0; size: auto; }
                 body { margin: 0; padding: 0; }
                 
                 /* Ensure background graphics are printed (Chrome/Edge/Safari) */
                 * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${htmlContent || '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#ccc;">Generating Form...</div>'}
          </body>
          </html>
        `;
        doc.write(enrichedContent);
        doc.close();
      }
    }
  }, [htmlContent]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Must focus the iframe WINDOW before printing to ensure it prints the frame content
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  // Helper to get raw numeric value if pixel for approximate outer container sizing
  const parseDim = (dim: string) => parseInt(dim) || 800;
  
  // We use CSS transforms to scale the "Page" while keeping its internal dimensions intact
  // The outer wrapper reserves the visual space for the scaled page
  const scaledWidth = parseDim(pageWidth) * zoom;
  const scaledHeight = parseDim(pageHeight) * zoom;
  
  // If units are not pixels, this calculation might be off visually in the scroll container, 
  // but the iframe transform itself will handle the content scaling correctly.
  // For '750px' standard, this works perfectly.

  return (
    <div className="flex flex-col h-full bg-erp-200">
      {/* Toolbar */}
      <div className="flex-none flex items-center justify-between px-6 py-3 bg-white border-b border-erp-300 shadow-sm z-10">
        <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-erp-700 uppercase tracking-wide">Print Preview</h2>
            <div className="h-4 w-px bg-erp-300"></div>
            <div className="flex items-center gap-2 bg-erp-100 rounded-md p-1">
                <button 
                  onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
                  className="p-1 hover:bg-white rounded text-erp-600 transition-colors"
                  title="Zoom Out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>
                <span className="text-xs font-mono w-12 text-center text-erp-700">{Math.round(zoom * 100)}%</span>
                <button 
                  onClick={() => setZoom(Math.min(2.5, zoom + 0.1))}
                  className="p-1 hover:bg-white rounded text-erp-600 transition-colors"
                  title="Zoom In"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
            <span className="text-xs text-erp-400">
              Page: {pageWidth} x {pageHeight}
            </span>
        </div>
        
        <div className="flex gap-2">
            <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-erp-800 hover:bg-erp-900 text-white text-sm font-medium rounded shadow transition-all hover:shadow-md"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
            </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-200/90 relative flex justify-center p-8">
          <div 
            style={{ 
                width: scaledWidth, 
                height: scaledHeight 
            }} 
            className="relative transition-all duration-200 ease-out flex-none shadow-2xl ring-1 ring-black/5"
          >
             <div 
                style={{
                  width: pageWidth,
                  height: pageHeight,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left'
                }}
                className="bg-white overflow-hidden"
             >
                <iframe
                    ref={iframeRef}
                    title="Form Preview"
                    className="w-full h-full border-none block"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-modals"
                />
             </div>
          </div>
      </div>
    </div>
  );
};

export default FormPreview;
