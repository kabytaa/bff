import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestUserControl } from './test-user-control';
afterEach(cleanup);
describe('operator test-user confirmation', () => {
  it('requires confirmation, saves exact intent, and supports cancellation', async () => {
    const save = vi.fn().mockResolvedValue({ isTestUser: true });
    render(
      <TestUserControl
        enabled={false}
        customer="test@example.invalid"
        onSave={save}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark as test user' }));
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.getByRole('group', { name: 'Confirm test-user change' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark as test user' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enable test user' }));
    await screen.findByRole('status');
    expect(save).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('explains non-destructive removal and keeps errors visible', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Synthetic conflict'));
    render(
      <TestUserControl enabled customer="test@example.invalid" onSave={save} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove test-user status' }),
    );
    expect(
      screen.getByText(/Existing test access and data will remain/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith(false));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
