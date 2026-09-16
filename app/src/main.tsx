import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { assertDiscriminators } from './solana/program';
import './index.css';

// @solana/spl-token reaches for a global Buffer that browsers don't provide.
globalThis.Buffer ??= Buffer;

// Catch a stale hand-written discriminator the moment the program changes.
if (import.meta.env.DEV) {
  assertDiscriminators().catch((err) => console.error(err));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
