import SOP_RAW from '../../docs/PRINTFORM_JS_SOP.md?raw';
import GENERATOR_RAW from '../../docs/PRINTFORM_JS_GENERATOR_SOP.md?raw';

let cached: string | null = null;

export const getPrintformSopText = (): string => {
  if (cached != null) return cached;
  cached = [
    '# PrintForm.js SOP (Project)\n',
    String(SOP_RAW || '').trim(),
    '\n\n---\n\n',
    '# PrintForm.js Generator SOP (Knowledge Pack)\n',
    String(GENERATOR_RAW || '').trim(),
  ]
    .join('')
    .trim();
  return cached;
};
