import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import {
  consumeCustomerDevelopmentGrant,
  CustomerDevelopmentAuthApp,
} from './developmentAuth';
import './styles.css';

const root = document.querySelector('#root');
if (!root) throw new Error('Customer development auth root is missing');

createRoot(root).render(
  <StrictMode>
    <CustomerDevelopmentAuthApp
      bffSiteUrl={import.meta.env.VITE_BFF_SITE_URL ?? ''}
      grant={consumeCustomerDevelopmentGrant()}
    />
  </StrictMode>,
);
