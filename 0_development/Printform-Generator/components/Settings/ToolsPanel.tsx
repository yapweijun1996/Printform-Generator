import React from 'react';
import { AVAILABLE_TOOLS, ToolItem } from '../../constants';

interface ToolsPanelProps {
  activeTools: string[];
  onToggleTool: (toolId: string) => void;
  onToggleCategory: (categoryItems: { id: string }[]) => void;
}

/**
 * 工具选择面板组件
 * 显示所有可用工具并允许用户启用/禁用
 */
const ToolsPanel: React.FC<ToolsPanelProps> = ({ activeTools, onToggleTool, onToggleCategory }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-erp-800">Agent Toolbox</h4>
        <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
          {activeTools?.length || 0} Enabled
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {AVAILABLE_TOOLS.map((category) => {
          const implementedItems: ToolItem[] = category.items.filter((t) => t.implemented);
          const allSelected = implementedItems.length > 0 && implementedItems.every((t) => activeTools.includes(t.id));
          return (
            <div
              key={category.category}
              className="bg-white rounded-lg border border-erp-200 shadow-sm overflow-hidden flex flex-col"
            >
              <div
                className="bg-erp-100/50 px-4 py-3 border-b border-erp-200 flex justify-between items-center cursor-pointer hover:bg-erp-100"
                onClick={() => (implementedItems.length > 0 ? onToggleCategory(implementedItems) : undefined)}
              >
                <h5 className="text-sm font-bold text-erp-700">{category.category}</h5>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    allSelected ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-erp-500 border-erp-200'
                  }`}
                >
                  {implementedItems.length === 0 ? 'Coming Soon' : allSelected ? 'All Active' : 'Select All'}
                </span>
              </div>
              <div className="p-2 flex-1">
                {category.items.map((tool) => {
                  const isChecked = (activeTools || []).includes(tool.id);
                  const isImplemented = tool.implemented;
                  return (
                    <label
                      key={tool.id}
                      className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all ${
                        !isImplemented
                          ? 'opacity-50 cursor-not-allowed bg-erp-50'
                          : isChecked
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-erp-50'
                      }`}
                    >
                      <div className="pt-0.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => (isImplemented ? onToggleTool(tool.id) : undefined)}
                          disabled={!isImplemented}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-erp-700'}`}>
                          {tool.label}
                          {!isImplemented && <span className="ml-2 text-[10px] text-erp-400">(Coming Soon)</span>}
                        </div>
                        <div className="text-xs text-erp-500 mt-0.5">{tool.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ToolsPanel;
