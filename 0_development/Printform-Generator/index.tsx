import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const patchBrokenKeyboardEventGetModifierState = () => {
  const safeGetModifierState = () => false;

  try {
    const eventProto = (globalThis as any)?.Event?.prototype as unknown;
    if (eventProto && typeof eventProto === 'object') {
      const p = eventProto as { getModifierState?: unknown };
      if (typeof p.getModifierState !== 'function') {
        Object.defineProperty(p, 'getModifierState', { value: safeGetModifierState, configurable: true });
      }
    }
  } catch {
    // ignore
  }

  try {
    const ensure = (e: Event) => {
      const evt = e as unknown as { getModifierState?: unknown };
      if (typeof evt.getModifierState === 'function') return;
      try {
        Object.defineProperty(evt, 'getModifierState', { value: safeGetModifierState, configurable: true });
      } catch {
        // ignore
      }
    };

    window.addEventListener('keydown', ensure as any, true);
    window.addEventListener('keyup', ensure as any, true);
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
