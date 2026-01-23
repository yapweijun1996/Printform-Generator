import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const patchBrokenKeyboardEventGetModifierState = () => {
  const safeGetModifierState = () => false;

  try {
    const proto = (globalThis as any)?.KeyboardEvent?.prototype as unknown;
    if (proto && typeof proto === 'object') {
      const p = proto as { getModifierState?: unknown };
      if ('getModifierState' in p && typeof p.getModifierState !== 'function') {
        Object.defineProperty(p, 'getModifierState', {
          value: safeGetModifierState,
          configurable: true,
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    window.addEventListener(
      'keydown',
      (e) => {
        const evt = e as unknown as { getModifierState?: unknown };
        if ('getModifierState' in evt && typeof evt.getModifierState !== 'function') {
          try {
            (evt as any).getModifierState = undefined;
          } catch {
            // ignore
          }
          try {
            Object.defineProperty(evt, 'getModifierState', {
              value: safeGetModifierState,
              configurable: true,
            });
          } catch {
            // ignore
          }
        }
      },
      true,
    );
  } catch {
    // ignore
  }
};

patchBrokenKeyboardEventGetModifierState();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
