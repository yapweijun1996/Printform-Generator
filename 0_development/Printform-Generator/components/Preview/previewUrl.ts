export const getBaseHref = () => {
  try {
    const href = window.location.href;
    return href.endsWith('/') ? href : href.substring(0, href.lastIndexOf('/') + 1);
  } catch {
    return '/';
  }
};

export const getPrintformScriptUrl = (baseHref: string) => {
  try {
    return new URL('printform.js', baseHref).toString();
  } catch {
    return './printform.js';
  }
};
