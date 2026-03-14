import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import App from './App.tsx'
import './index.css'

// Polyfill Buffer for Solana
window.Buffer = Buffer

// Suppress Phantom wallet extension errors in preview/iframe environments
// This prevents the "Origin not allowed" error from crashing the app
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorString = args.join(' ');
  if (
    errorString.includes('Origin not allowed') ||
    errorString.includes('chrome-extension://') ||
    errorString.includes('inpage.js')
  ) {
    // Silently ignore wallet extension errors in preview
    return;
  }
  originalConsoleError.apply(console, args);
};

// Handle uncaught errors from wallet extensions
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Origin not allowed') ||
    event.filename?.includes('chrome-extension://')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

// Handle unhandled promise rejections from wallet extensions
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.toString() || '';
  if (
    reason.includes('Origin not allowed') ||
    reason.includes('chrome-extension://')
  ) {
    event.preventDefault();
    return;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
