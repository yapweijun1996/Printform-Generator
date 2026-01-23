import React, { useState } from 'react';
import ConnectionTest from './ConnectionTest';

interface ApiKeySectionProps {
  apiKey: string;
  model: string;
  onApiKeyChange: (apiKey: string) => void;
}

/**
 * API Key 配置区域组件
 * 包含 API Key 输入、显示/隐藏切换和连接测试
 */
const ApiKeySection: React.FC<ApiKeySectionProps> = ({ apiKey, model, onApiKeyChange }) => {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-erp-700">Gemini API Key</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-3 py-2 pr-10 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute inset-y-0 right-0 px-3 flex items-center text-erp-400 hover:text-erp-600 focus:outline-none"
            title={showApiKey ? 'Hide API Key' : 'Show API Key'}
          >
            {showApiKey ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        <ConnectionTest apiKey={apiKey} model={model} />
      </div>
      <p className="text-xs text-erp-500">
        Stored locally. Get key at{' '}
        <a
          href="https://aistudio.google.com/"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:underline"
        >
          Google AI Studio
        </a>
        .
      </p>
    </div>
  );
};

export default ApiKeySection;
