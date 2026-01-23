import { useState } from 'react';
import { UserSettings } from '../types';
import { IMPLEMENTED_TOOL_IDS, ALL_TOOL_IDS } from '../constants';

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('formgenie_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const requestedTools = Array.isArray(parsed.activeTools) ? parsed.activeTools : [];
        const knownToolSet = new Set(ALL_TOOL_IDS);
        const filteredTools = requestedTools.filter((id: string) => knownToolSet.has(id));
        parsed.activeTools = filteredTools.length > 0 ? filteredTools : IMPLEMENTED_TOOL_IDS;
        return {
          apiKey: (parsed.apiKey || process.env.API_KEY || '').trim(),
          model: parsed.model || 'gemini-3-pro-preview',
          activeTools: parsed.activeTools,
          pageWidth: parsed.pageWidth || '750px',
          pageHeight: parsed.pageHeight || '1050px',
          minRowItemsForPaginationTest:
            typeof parsed.minRowItemsForPaginationTest === 'number' &&
            Number.isFinite(parsed.minRowItemsForPaginationTest)
              ? parsed.minRowItemsForPaginationTest
              : 70,
        };
      }
    } catch (e) {
      console.warn('Failed to parse settings', e);
    }
    return {
      apiKey: (process.env.API_KEY || '').trim(),
      model: 'gemini-3-pro-preview',
      activeTools: IMPLEMENTED_TOOL_IDS,
      pageWidth: '750px',
      pageHeight: '1050px',
      minRowItemsForPaginationTest: 70,
    };
  });

  const updateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    localStorage.setItem('formgenie_settings', JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings,
  };
};
