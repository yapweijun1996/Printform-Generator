import React from 'react';

interface PreviewToolbarProps {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  pageWidth: string;
  pageHeight: string;
  onPrint: () => void;
}

const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  zoom,
  onZoomOut,
  onZoomIn,
  pageWidth,
  pageHeight,
  onPrint,
}) => {
  return (
    <div className="flex-none flex items-center justify-between px-6 py-3 bg-white border-b border-erp-300 shadow-sm z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold text-erp-700 uppercase tracking-wide">Print Preview</h2>
        <div className="h-4 w-px bg-erp-300"></div>
        <div className="flex items-center gap-2 bg-erp-100 rounded-md p-1">
          <button
            onClick={onZoomOut}
            className="p-1 hover:bg-white rounded text-erp-600 transition-colors"
            title="Zoom Out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-xs font-mono w-12 text-center text-erp-700">{Math.round(zoom * 100)}%</span>
          <button
            onClick={onZoomIn}
            className="p-1 hover:bg-white rounded text-erp-600 transition-colors"
            title="Zoom In"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
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
          onClick={onPrint}
          className="flex items-center gap-2 px-4 py-2 bg-erp-800 hover:bg-erp-900 text-white text-sm font-medium rounded shadow transition-all hover:shadow-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print
        </button>
      </div>
    </div>
  );
};

export default PreviewToolbar;
