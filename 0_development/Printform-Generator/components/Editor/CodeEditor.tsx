import React from 'react';
import Editor, { loader } from '@monaco-editor/react';

// Configure Monaco to load from a reliable CDN since we are using importmap/esm
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, readOnly }) => {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#1e1e1e] flex flex-col group overflow-hidden">
      {/* Editor Header/Tab */}
      <div className="flex-none h-9 bg-[#252526] flex items-center px-4 border-b border-[#333] justify-between select-none">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5 10 5 10-5-5-2.5-5 2.5z" />
          </svg>
          <span className="text-xs text-blue-400 font-mono italic mr-2">invoice-template.html</span>
          <span className="text-[10px] text-gray-500">HTML</span>
        </div>
        <div className="flex items-center gap-2">
          {readOnly && <span className="text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded">READ ONLY</span>}
        </div>
      </div>

      {/* Main Editor Area: Monaco */}
      <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={code}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            readOnly: readOnly,
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            fontSize: 13,
            minimap: { enabled: false }, // Save space in split view
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            tabSize: 2,
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 10,
            },
            bracketPairColorization: {
              enabled: true,
            },
            formatOnPaste: true,
            formatOnType: true,
          }}
          loading={
            <div className="flex h-full items-center justify-center text-gray-500 text-xs">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading Editor...
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div className="flex-none h-6 bg-[#007acc] text-white flex items-center px-3 justify-between text-[10px] select-none z-10">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="font-bold">Ln</span> {code.split('\n').length}, <span className="font-bold">Col</span> 1
          </span>
        </div>
        <div className="flex gap-3">
          <span>HTML</span>
          <span>UTF-8</span>
          <span className="hover:bg-white/20 px-1 rounded cursor-pointer transition-colors" title="Prettier">
            Prettier
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
