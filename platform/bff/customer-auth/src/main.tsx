import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CustomerAuthApp } from './app';
import './styles.css';

const root = document.querySelector('#root');
if (!root) throw new Error('Customer auth root is missing');

createRoot(root).render(
  <StrictMode>
    <CustomerAuthApp bffSiteUrl={import.meta.env.VITE_BFF_SITE_URL ?? ''} />
  </StrictMode>,
);
