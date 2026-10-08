import { useBffAuth } from '@tofler/bff-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { CurrentProductAccess, ProjectSummary } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';
import { safeProductMessage } from '../product-error';
import { MetadataPageControls, useMetadataPages } from '../metadata-pages';

function errorMessage(error: unknown) {
  return safeProductMessage(
    error,
    'The project action failed. Please try again.',
  );
}

export function Component() {
  const backend = useTableCardsBackend();
  const { snapshot } = useBffAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const loadPage = useCallback(
    async (cursor?: string | null) => {
      if (filter === 'archived')
        return await backend.listProjectPage(filter, cursor);
      return {
        items: await backend.listProjects('active'),
        cursor: '',
        done: true,
      };
    },
    [backend, filter],
  );
  const library = useMetadataPages(loadPage, 'projects');
  const projects: readonly ProjectSummary[] = library.items;
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const listLoading = loading || library.page.loading;

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError(null);
    try {
      const [, nextAccess] = await Promise.all([
        library.refresh(),
        backend.getCurrentAccess(),
      ]);
      if (sequence !== loadSequence.current) return;
      setAccess(nextAccess);
    } catch (caught) {
      if (sequence !== loadSequence.current) return;
      setError(errorMessage(caught));
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [backend, library.refresh]);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
    return () => {
      loadSequence.current += 1;
    };
  }, [filter, load, snapshot.generation]);

  const run = async (projectId: string, action: () => Promise<void>) => {
    setBusyId(projectId);
    setError(null);
    try {
      await action();
      await loadRef.current();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="app-page" aria-labelledby="projects-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Your work</p>
          <h1 id="projects-title">Projects</h1>
          <p>
            {filter === 'active'
              ? `${listLoading || library.page.error ? '—' : projects.length} of ${access?.maxActiveProjects ?? '—'} active projects`
              : 'Archived projects stay available until you restore them.'}
          </p>
        </div>
        <Link className="button" to="/create">
          Create project
        </Link>
      </header>

      <div
        className="segmented-control"
        role="group"
        aria-label="Project state"
      >
        <button
          type="button"
          className={filter === 'active' ? 'active' : ''}
          onClick={() => {
            if (filter === 'active') return;
            setLoading(true);
            library.clear();
            setFilter('active');
          }}
        >
          Active
        </button>
        <button
          type="button"
          className={filter === 'archived' ? 'active' : ''}
          onClick={() => {
            if (filter === 'archived') return;
            setLoading(true);
            library.clear();
            setFilter('archived');
          }}
        >
          Archived
        </button>
      </div>

      {error ? (
        <p className="notice error" role="alert">
          {error}
          <button
            className="secondary-button"
            type="button"
            onClick={() => void load()}
          >
            Retry projects
          </button>
        </p>
      ) : null}
      {listLoading ? <p className="route-state">Loading projects…</p> : null}
      {!listLoading &&
      !error &&
      !library.page.error &&
      projects.length === 0 ? (
        <div className="empty-state">
          <h2>
            {filter === 'active'
              ? 'Create your first project'
              : 'Nothing archived'}
          </h2>
          <p>
            {filter === 'active'
              ? 'Import names, choose a design and create a print-ready PDF.'
              : 'Archived projects will appear here.'}
          </p>
          {filter === 'active' ? (
            <Link className="button" to="/create">
              Start creating
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="project-grid">
        {!listLoading &&
          !library.page.error &&
          projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div>
                <p className="eyebrow">{project.guestCount} cards</p>
                <h2>{project.title}</h2>
                <p>
                  {project.designKind === 'predefined'
                    ? 'Catalog design'
                    : project.designKind === 'ai'
                      ? 'AI background'
                      : 'Uploaded artwork'}
                </p>
                <small>
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </small>
              </div>
              <div className="inline-actions wrap">
                {filter === 'active' ? (
                  <>
                    <Link
                      className="secondary-button"
                      to={`/projects/${project.id}`}
                    >
                      Open
                    </Link>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={busyId === project.id}
                      onClick={() =>
                        void run(project.id, async () => {
                          const copy = await backend.duplicateProject(
                            project.id,
                          );
                          navigate(`/projects/${copy.id}`);
                        })
                      }
                    >
                      Make a copy
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={busyId === project.id}
                      onClick={() => {
                        if (window.confirm(`Archive “${project.title}”?`)) {
                          void run(project.id, () =>
                            backend.archiveProject(project.id),
                          );
                        }
                      }}
                    >
                      Archive
                    </button>
                  </>
                ) : (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busyId === project.id}
                    onClick={() =>
                      void run(project.id, async () => {
                        const restored = await backend.restoreProject(
                          project.id,
                        );
                        navigate(`/projects/${restored.id}`);
                      })
                    }
                  >
                    Restore
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
      {!loading && (filter === 'archived' || library.page.error) ? (
        <MetadataPageControls
          label="projects"
          page={library.page}
          onLoadMore={library.loadMore}
          disabled={busyId !== null}
          showEnd={projects.length > 0}
        />
      ) : null}
    </section>
  );
}
