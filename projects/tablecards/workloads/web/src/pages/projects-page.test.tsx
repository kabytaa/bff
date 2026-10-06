// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from './projects-page';

const mocks = vi.hoisted(() => ({
  backend: {
    listProjects: vi.fn(),
    listProjectPage: vi.fn(),
    getCurrentAccess: vi.fn(),
    restoreProject: vi.fn(),
  },
}));
vi.mock('@tofler/bff-auth/react', () => ({
  useBffAuth: () => ({ snapshot: { generation: 1 } }),
}));
vi.mock('../use-tablecards-backend', () => ({
  useTableCardsBackend: () => mocks.backend,
}));
function project(id: string, state: 'active' | 'archived' = 'archived') {
  return {
    id,
    title: id,
    state,
    designKind: 'predefined',
    designReference: 'minimal-ivory',
    guestCount: 2,
    revision: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}
function mount() {
  const router = createMemoryRouter([{ path: '*', element: <Component /> }]);
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.backend.getCurrentAccess.mockResolvedValue({ maxActiveProjects: 25 });
  mocks.backend.listProjects.mockResolvedValue([
    project('Active event', 'active'),
  ]);
});
afterEach(cleanup);
describe('complete archived project discovery', () => {
  it('loads older archived rows, retries the same cursor, ends, and restores an older project', async () => {
    mocks.backend.listProjectPage
      .mockResolvedValueOnce({
        items: [project('Recent archived')],
        done: false,
        cursor: 'older',
      })
      .mockRejectedValueOnce(new Error('Temporary metadata outage'))
      .mockResolvedValueOnce({
        items: [project('Recent archived'), project('Older archived')],
        done: true,
        cursor: '',
      });
    mocks.backend.restoreProject.mockResolvedValue(
      project('Older archived', 'active'),
    );
    const router = mount();
    await screen.findByText('1 of 25 active projects');
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    await screen.findByRole('heading', { name: 'Recent archived' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more projects' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry projects page' }),
    );
    await screen.findByRole('heading', { name: 'Older archived' });
    expect(mocks.backend.listProjectPage.mock.calls).toEqual([
      ['archived', undefined],
      ['archived', 'older'],
      ['archived', 'older'],
    ]);
    expect(
      screen.getAllByRole('heading', { name: 'Recent archived' }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Load more projects' }),
    ).toBeNull();
    const older = screen
      .getByRole('heading', { name: 'Older archived' })
      .closest('article')!;
    fireEvent.click(within(older).getByRole('button', { name: 'Restore' }));
    await waitFor(() =>
      expect(mocks.backend.restoreProject).toHaveBeenCalledWith(
        'Older archived',
      ),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/projects/Older archived'),
    );
  });
  it('does not present a failed active-project load as an empty workspace', async () => {
    mocks.backend.listProjects.mockRejectedValueOnce(
      new Error('Temporary outage'),
    );
    mount();
    const retry = await screen.findByRole('button', {
      name: 'Retry projects page',
    });
    expect(screen.queryByText('Create your first project')).toBeNull();
    fireEvent.click(retry);
    await screen.findByRole('heading', { name: 'Active event' });
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('never shows controls for the old filter while the new filter is pending', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.backend.listProjectPage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    mount();
    await screen.findByRole('heading', { name: 'Active event' });
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByRole('heading', { name: 'Active event' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Archived' }));
    expect(screen.queryByRole('heading', { name: 'Active event' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull();
    finish?.({ items: [project('Archived event')], done: true, cursor: '' });
    await screen.findByRole('heading', { name: 'Archived event' });
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
  });
});
