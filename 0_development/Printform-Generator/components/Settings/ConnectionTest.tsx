import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

interface ConnectionTestProps {
  apiKey: string;
  model: string;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

/**
 * API 连接测试组件
 * 测试 Gemini API Key 的有效性
 */
const ConnectionTest: React.FC<ConnectionTestProps> = ({ apiKey, model }) => {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTestConnection = async () => {
    const trimmedKey = (apiKey || '').trim();
    if (!trimmedKey) {
      setTestStatus('error');
      setTestMessage('Please enter an API Key first.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Pinging Gemini API...');

    try {
      const ai = new GoogleGenAI({ apiKey: trimmedKey });
      await ai.models.generateContent({
        model: model || 'gemini-3-flash-preview',
        contents: 'Ping',
      });
      setTestStatus('success');
      setTestMessage('Connection Successful! API Key is valid.');
    } catch (error: any) {
      console.error(error);
      setTestStatus('error');
      let msg = error.message || 'Connection failed.';
      if (msg.includes('403') || msg.includes('API key not valid')) {
        msg = 'Invalid API Key or permissions.';
      }
      setTestMessage(msg);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleTestConnection}
        disabled={!apiKey || testStatus === 'testing'}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
          testStatus === 'success'
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : testStatus === 'error'
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-erp-100 text-erp-700 hover:bg-erp-200'
        }`}
      >
        {testStatus === 'testing' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Test
          </>
        ) : testStatus === 'success' ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            OK
          </>
        ) : (
          <>Test Key</>
        )}
      </button>

      {testMessage && (
        <p
          className={`text-xs font-medium ${
            testStatus === 'success' ? 'text-green-600' : testStatus === 'error' ? 'text-red-600' : 'text-erp-500'
          }`}
        >
          {testMessage}
        </p>
      )}
    </div>
  );
};

export default ConnectionTest;
