import React from 'react';

interface PageSizeSectionProps {
  pageWidth: string;
  pageHeight: string;
  onPageWidthChange: (width: string) => void;
  onPageHeightChange: (height: string) => void;
}

/**
 * 页面尺寸配置组件
 * 允许用户设置默认的页面宽度和高度
 */
const PageSizeSection: React.FC<PageSizeSectionProps> = ({
  pageWidth,
  pageHeight,
  onPageWidthChange,
  onPageHeightChange,
}) => {
  return (
    <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
      <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-4 border-b border-erp-100 pb-2">
        Layout Defaults
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-erp-700">Default Page Width</label>
          <input
            type="text"
            value={pageWidth}
            onChange={(e) => onPageWidthChange(e.target.value)}
            placeholder="750px"
            className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800"
          />
          <p className="text-xs text-erp-500">e.g., "750px" or "210mm"</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-erp-700">Default Page Height</label>
          <input
            type="text"
            value={pageHeight}
            onChange={(e) => onPageHeightChange(e.target.value)}
            placeholder="1050px"
            className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800"
          />
          <p className="text-xs text-erp-500">e.g., "1050px" or "297mm"</p>
        </div>
      </div>
    </div>
  );
};

export default PageSizeSection;
