
import { useState } from 'react';
import { UserSettings } from '../types';
import { ALL_TOOL_IDS } from '../constants';

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
        const saved = localStorage.getItem('formgenie_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed.activeTools) || parsed.activeTools.length === 0) {
                 parsed.activeTools = ALL_TOOL_IDS; 
            }
            return {
                apiKey: parsed.apiKey || process.env.API_KEY || '',
                model: parsed.model || 'gemini-3-pro-preview',
                activeTools: parsed.activeTools,
                pageWidth: parsed.pageWidth || '750px',
                pageHeight: parsed.pageHeight || '1050px'
            };
        }
    } catch (e) {
        console.warn("Failed to parse settings", e);
    }
    return { 
        apiKey: process.env.API_KEY || '', 
        model: 'gemini-3-pro-preview',
        activeTools: ALL_TOOL_IDS,
        pageWidth: '750px',
        pageHeight: '1050px'
    };
  });

  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('formgenie_settings', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings
  };
};
