// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { PolicyPage } from './policy-page';

afterEach(cleanup);

describe('Preview disclosures match Operator and test-checkout behavior', () => {
  it('limits simulated checkout and discloses AI support vendors without promising original downloads', () => {
    render(
      <MemoryRouter>
        <PolicyPage kind="privacy" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/operator-designated test users/u)).toBeTruthy();
    expect(
      screen.getByText(/Support email is sent and received through Resend/u),
    ).toBeTruthy();
    expect(
      screen.getByText(/We do not offer original attachments as downloads/u),
    ).toBeTruthy();
    expect(
      screen.queryByText(/public support channel are not yet provided/u),
    ).toBeNull();
  });

  it('routes contact to the configured support surface instead of a hardcoded environment mailbox', () => {
    render(
      <MemoryRouter>
        <PolicyPage kind="contact" />
      </MemoryRouter>,
    );
    expect(
      screen
        .getByRole('link', { name: 'Contact support or send feedback' })
        .getAttribute('href'),
    ).toBe('/contact');
    expect(screen.getByText(/operator before sending/u)).toBeTruthy();
    expect(screen.queryByText(/not configured yet/u)).toBeNull();
  });
});
