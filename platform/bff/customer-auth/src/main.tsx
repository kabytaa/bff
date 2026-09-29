import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CustomerAuthApp } from './app';
import { CheckoutApp } from './checkout';
import './styles.css';

const root = document.querySelector('#root');
if (!root) throw new Error('Customer auth root is missing');

const application =
  window.location.pathname === '/checkout' ? (
    <CheckoutApp bffSiteUrl={import.meta.env.VITE_BFF_SITE_URL ?? ''} />
  ) : (
    <CustomerAuthApp bffSiteUrl={import.meta.env.VITE_BFF_SITE_URL ?? ''} />
  );

createRoot(root).render(<StrictMode>{application}</StrictMode>);
