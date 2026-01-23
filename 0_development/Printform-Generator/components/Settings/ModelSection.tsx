import React from 'react';
import { GEMINI_MODELS } from '../../constants';

interface ModelSectionProps {
  model: string;
  onModelChange: (model: string) => void;
}

/**
 * AI 模型选择组件
 * 允许用户在不同的 Gemini 模型之间切换
 */
const ModelSection: React.FC<ModelSectionProps> = ({ model, onModelChange }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-erp-700">AI Model</label>
      <input
        list="gemini-models"
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
      />
      <datalist id="gemini-models">
        {GEMINI_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </datalist>
      <p className="text-xs text-erp-500">Pro handles complex logic better. Flash is faster for small CSS edits.</p>
    </div>
  );
};

export default ModelSection;
