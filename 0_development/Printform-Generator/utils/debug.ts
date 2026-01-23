export const isDebugEnabled = () => {
  try {
    return localStorage.getItem('formgenie_debug') === '1';
  } catch {
    return false;
  }
};

export const debugLog = (...args: any[]) => {
  if (!isDebugEnabled()) return;

  console.log('[FormGenie][Debug]', ...args);
};
