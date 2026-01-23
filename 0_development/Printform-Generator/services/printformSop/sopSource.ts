import SOP_RAW from '../../docs/PRINTFORM_JS_SOP.md?raw';

let cached: string | null = null;

export const getPrintformSopText = (): string => {
  if (cached != null) return cached;
  cached = String(SOP_RAW || '');
  return cached;
};
