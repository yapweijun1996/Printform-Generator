
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { UserSettings } from '../../types';
import { AVAILABLE_TOOLS } from '../../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
    setTestStatus('idle');
    setTestMessage('');
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleTestConnection = async () => {
      if (!localSettings.apiKey) {
          setTestStatus('error');
          setTestMessage('Please enter an API Key first.');
          return;
      }
      
      setTestStatus('testing');
      setTestMessage('Pinging Gemini API...');
      
      try {
          const ai = new GoogleGenAI({ apiKey: localSettings.apiKey });
          await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: 'Ping',
          });
          setTestStatus('success');
          setTestMessage('Connection Successful! API Key is valid.');
      } catch (error: any) {
          console.error(error);
          setTestStatus('error');
          // Extract a user-friendly error message if possible
          let msg = error.message || 'Connection failed.';
          if (msg.includes('403') || msg.includes('API key not valid')) msg = 'Invalid API Key or permissions.';
          setTestMessage(msg);
      }
  };

  const toggleTool = (toolId: string) => {
    const current = localSettings.activeTools || [];
    const exists = current.includes(toolId);
    let newTools;
    if (exists) {
        newTools = current.filter(t => t !== toolId);
    } else {
        newTools = [...current, toolId];
    }
    setLocalSettings({ ...localSettings, activeTools: newTools });
  };

  // Select/Deselect All helper for a category
  const toggleCategory = (categoryItems: { id: string }[]) => {
      const ids = categoryItems.map(i => i.id);
      const allSelected = ids.every(id => localSettings.activeTools.includes(id));
      
      let newTools = [...localSettings.activeTools];
      if (allSelected) {
          // Deselect all in category
          newTools = newTools.filter(id => !ids.includes(id));
      } else {
          // Select all in category
          const toAdd = ids.filter(id => !newTools.includes(id));
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Agent Configuration
                </h3>
                <p className="text-erp-400 text-xs mt-1">Configure your AI Copilot's capabilities and toolbox.</p>
            </div>
            <button onClick={onClose} className="text-erp-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-erp-50">
            
            {/* 1. Core Config Section */}
            <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
                <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-4 border-b border-erp-100 pb-2">Connection Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-erp-700">Gemini API Key</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type={showApiKey ? "text" : "password"}
                                    value={localSettings.apiKey}
                                    onChange={(e) => setLocalSettings({...localSettings, apiKey: e.target.value})}
                                    placeholder="AIzaSy..."
                                    className="w-full px-3 py-2 pr-10 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800 font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute inset-y-0 right-0 px-3 flex items-center text-erp-400 hover:text-erp-600 focus:outline-none"
                                    title={showApiKey ? "Hide API Key" : "Show API Key"}
                                >
                                    {showApiKey ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <button
                                onClick={handleTestConnection}
                                disabled={!localSettings.apiKey || testStatus === 'testing'}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                                    testStatus === 'success' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                    testStatus === 'error' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                    'bg-erp-100 text-erp-700 hover:bg-erp-200'
                                }`}
                            >
                                {testStatus === 'testing' ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Test
                                    </>
                                ) : testStatus === 'success' ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        OK
                                    </>
                                ) : (
                                    <>Test Key</>
                                )}
                            </button>
                        </div>
                        
                        {/* Status Message Area */}
                        <div className="flex justify-between items-start">
                             <p className="text-xs text-erp-500">
                                Stored locally. Get key at <a href="https://aistudio.google.com/" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>.
                            </p>
                            {testMessage && (
                                <span className={`text-xs font-medium ${
                                    testStatus === 'success' ? 'text-green-600' : 
                                    testStatus === 'error' ? 'text-red-600' : 'text-erp-500'
                                }`}>
                                    {testMessage}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-erp-700">AI Model</label>
                        <select 
                            value={localSettings.model}
                            onChange={(e) => setLocalSettings({...localSettings, model: e.target.value})}
                            className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        >
                            <option value="gemini-3-pro-preview">Gemini 3 Pro (Recommended)</option>
                            <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                        </select>
                        <p className="text-xs text-erp-500">
                            Pro handles complex logic better. Flash is faster for small CSS edits.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Layout Defaults Section */}
            <div className="bg-white p-5 rounded-lg border border-erp-200 shadow-sm">
                <h4 className="text-sm font-bold text-erp-800 uppercase tracking-wide mb-4 border-b border-erp-100 pb-2">Layout Defaults</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-erp-700">Default Page Width</label>
                        <input 
                            type="text"
                            value={localSettings.pageWidth}
                            onChange={(e) => setLocalSettings({...localSettings, pageWidth: e.target.value})}
                            placeholder="750px"
                            className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800"
                        />
                        <p className="text-xs text-erp-500">e.g., "750px" or "210mm"</p>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-erp-700">Default Page Height</label>
                        <input 
                            type="text"
                            value={localSettings.pageHeight}
                            onChange={(e) => setLocalSettings({...localSettings, pageHeight: e.target.value})}
                            placeholder="1050px"
                            className="w-full px-3 py-2 border border-erp-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-erp-800"
                        />
                        <p className="text-xs text-erp-500">e.g., "1050px" or "297mm"</p>
                    </div>
                </div>
            </div>

            {/* 3. Toolbox Selection */}
            <div>
                 <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-erp-800">Agent Toolbox</h4>
                    <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {localSettings.activeTools?.length || 0} Enabled
                    </span>
                 </div>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {AVAILABLE_TOOLS.map((category) => {
                        const allSelected = category.items.every(t => localSettings.activeTools.includes(t.id));
                        return (
                        <div key={category.category} className="bg-white rounded-lg border border-erp-200 shadow-sm overflow-hidden flex flex-col">
                            <div 
                                className="bg-erp-100/50 px-4 py-3 border-b border-erp-200 flex justify-between items-center cursor-pointer hover:bg-erp-100"
                                onClick={() => toggleCategory(category.items)}
                            >
                                <h5 className="text-sm font-bold text-erp-700">{category.category}</h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${allSelected ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-erp-500 border-erp-200'}`}>
                                    {allSelected ? 'All Active' : 'Select All'}
                                </span>
                            </div>
                            <div className="p-2 flex-1">
                                {category.items.map((tool) => {
                                    const isChecked = (localSettings.activeTools || []).includes(tool.id);
                                    return (
                                        <label 
                                            key={tool.id} 
                                            className={`flex items-start gap-3 p-3 rounded-md cursor-pointer transition-all ${isChecked ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-erp-50'}`}
                                        >
                                            <div className="pt-0.5">
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleTool(tool.id)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-erp-700'}`}>
                                                    {tool.label}
                                                </div>
                                                <div className="text-xs text-erp-500 mt-0.5">{tool.description}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )})}
                 </div>
            </div>

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
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
