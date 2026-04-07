import React, { useState, useEffect } from 'react';
import { UserSettings } from '../../types';
import ApiKeySection from './ApiKeySection';
import ModelSection from './ModelSection';
import PageSizeSection from './PageSizeSection';
import ToolsPanel from './ToolsPanel';
import PrintformJsCheckSection from './PrintformJsCheckSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
  activeHtmlContent: string;
}

/**
 * 设置模态框主组件
 * 管理 API Key、模型选择、页面尺寸和工具配置
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave, activeHtmlContent }) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ ...localSettings, apiKey: (localSettings.apiKey || '').trim() });
    onClose();
  };

  const toggleTool = (toolId: string) => {
    const current = localSettings.activeTools || [];
    const exists = current.includes(toolId);
    const newTools = exists ? current.filter((t) => t !== toolId) : [...current, toolId];
    setLocalSettings({ ...localSettings, activeTools: newTools });
  };

  const toggleCategory = (categoryItems: { id: string }[]) => {
    const ids = categoryItems.map((i) => i.id);
    const allSelected = ids.every((id) => localSettings.activeTools.includes(id));

    let newTools = [...localSettings.activeTools];
    if (allSelected) {
      newTools = newTools.filter((id) => !ids.includes(id));
    } else {
      const toAdd = ids.filter((id) => !newTools.includes(id));
      newTools = [...newTools, ...toAdd];
    }
    setLocalSettings({ ...localSettings, activeTools: newTools });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-erp-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-erp-900 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Agent Configuration
            </h3>
            <p className="text-erp-400 text-xs mt-1">Configure your AI Copilot's capabilities and toolbox.</p>
          </div>
          <button
            onClick={onClose}
            className="text-erp-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-erp-50">
          {/* 1. Connection Settings */}
          <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
            <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-4 border-b border-erp-100 pb-2">
              Connection Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ApiKeySection
                apiKey={localSettings.apiKey}
                model={localSettings.model}
                onApiKeyChange={(apiKey) => setLocalSettings({ ...localSettings, apiKey })}
              />
              <ModelSection
                model={localSettings.model}
                onModelChange={(model) => setLocalSettings({ ...localSettings, model })}
              />
            </div>
          </div>

          {/* 2. Layout Defaults */}
          <PageSizeSection
            pageWidth={localSettings.pageWidth}
            pageHeight={localSettings.pageHeight}
            onPageWidthChange={(pageWidth) => setLocalSettings({ ...localSettings, pageWidth })}
            onPageHeightChange={(pageHeight) => setLocalSettings({ ...localSettings, pageHeight })}
          />

          {/* 3. PrintForm.js SOP Checks */}
          <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
            <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-4 border-b border-erp-100 pb-2">
              PrintForm.js Test Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-erp-700">Min Row Items for Pagination Test</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={
                    Number.isFinite(localSettings.minRowItemsForPaginationTest)
                      ? localSettings.minRowItemsForPaginationTest
                      : 20
                  }
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    setLocalSettings({
                      ...localSettings,
                      minRowItemsForPaginationTest: Number.isFinite(next) ? Math.max(0, next) : 0,
                    });
                  }}
                  className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800 font-mono"
                  placeholder="20"
                />
                <p className="text-xs text-erp-500">
                  用于“3 页测试”的提示阈值（不是硬性限制）。dummy row item
                  主要用于补满页高，不会替代真实行项目触发多页。
                </p>
              </div>
            </div>
          </div>

          <PrintformJsCheckSection
            htmlContent={activeHtmlContent}
            pageWidth={localSettings.pageWidth}
            pageHeight={localSettings.pageHeight}
            minRowItemsForPaginationTest={localSettings.minRowItemsForPaginationTest}
          />

          {/* 4. Toolbox Selection */}
          <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
            <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-4 border-b border-erp-100 pb-2">
              Change Application
            </h4>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(localSettings.semanticRagEnabled)}
                onChange={(e) => setLocalSettings({ ...localSettings, semanticRagEnabled: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold text-erp-700">Semantic RAG (Embeddings)</div>
                <div className="text-xs text-erp-500 mt-0.5">
                  启用后：会使用 Gemini Embeddings 从
                  SOP/参考模板中检索最相关片段，作为上下文输入给模型（更稳、更少胡写）。
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-erp-600 mb-1">Top-K Snippets</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    step={1}
                    value={Number.isFinite(localSettings.semanticRagTopK) ? localSettings.semanticRagTopK : 4}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value, 10);
                      setLocalSettings({
                        ...localSettings,
                        semanticRagTopK: Number.isFinite(next) ? Math.max(1, Math.min(8, next)) : 4,
                      });
                    }}
                    className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800 font-mono"
                    placeholder="4"
                    disabled={!localSettings.semanticRagEnabled}
                  />
                </div>
              </div>
            </label>
            <div className="h-4" />
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(localSettings.strictPreviewGate)}
                onChange={(e) => setLocalSettings({ ...localSettings, strictPreviewGate: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-semibold text-erp-700">Strict Preview Gate</div>
                <div className="text-xs text-erp-500 mt-0.5">
                  启用后：如果本轮无法刷新到最新 Preview 快照，将阻止 AI 执行 modify/insert
                  （避免在“看不到最新预览”的情况下改码）。
                </div>
              </div>
            </label>
            <div className="h-4" />
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(localSettings.autoApplyDiff)}
                onChange={(e) => setLocalSettings({ ...localSettings, autoApplyDiff: e.target.checked })}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-semibold text-erp-700">Auto-apply after Diff Preview</div>
                <div className="text-xs text-erp-500 mt-0.5">
                  启用后，AI 会先生成 diff 预览，但会自动执行修改（不再弹出 “要应用这些改动吗？” 确认）。
                </div>
              </div>
            </label>
          </div>

          <ToolsPanel
            activeTools={localSettings.activeTools}
            onToggleTool={toggleTool}
            onToggleCategory={toggleCategory}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-erp-200 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-erp-600 hover:bg-erp-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 text-sm bg-erp-800 text-white hover:bg-erp-900 rounded-lg shadow-lg hover:shadow-xl transition-all font-medium flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
