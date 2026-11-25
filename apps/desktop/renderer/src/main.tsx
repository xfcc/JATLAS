import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

async function renderApp() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock')) {
    await import('./devMockDesktopApi');
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void renderApp();
