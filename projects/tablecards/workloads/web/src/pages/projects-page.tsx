import { useBffAuth } from '@tofler/bff-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { CurrentProductAccess, ProjectSummary } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The project action failed.';
}

export function Component() {
  const backend = useTableCardsBackend();
  const { snapshot } = useBffAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'active' | 'archived'>('active');
  const [projects, setProjects] = useState<readonly ProjectSummary[]>([]);
  const [access, setAccess] = useState<CurrentProductAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const filterRef = useRef(filter);
  const loadSequence = useRef(0);
  filterRef.current = filter;

  const load = useCallback(
    async (requestedFilter: 'active' | 'archived') => {
      const sequence = ++loadSequence.current;
      setLoading(true);
      setError(null);
      try {
        const [nextProjects, nextAccess] = await Promise.all([
          backend.listProjects(requestedFilter),
          backend.getCurrentAccess(),
        ]);
        if (sequence !== loadSequence.current) return;
        setProjects(nextProjects);
        setAccess(nextAccess);
      } catch (caught) {
        if (sequence !== loadSequence.current) return;
        setError(errorMessage(caught));
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    },
    [backend],
  );

  useEffect(() => {
    void load(filter);
  }, [filter, load, snapshot.generation]);

  const run = async (projectId: string, action: () => Promise<void>) => {
    setBusyId(projectId);
    setError(null);
    try {
      await action();
      await load(filterRef.current);
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
              ? `${projects.length} of ${access?.maxActiveProjects ?? '—'} active projects`
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
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          type="button"
          className={filter === 'archived' ? 'active' : ''}
          onClick={() => setFilter('archived')}
        >
          Archived
        </button>
      </div>

      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p className="route-state">Loading projects…</p> : null}
      {!loading && projects.length === 0 ? (
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
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <div>
              <p className="eyebrow">{project.guestCount} cards</p>
              <h2>{project.title}</h2>
              <p>
                {project.designKind === 'predefined'
                  ? 'Included design'
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
                    type="button"
                    disabled={busyId === project.id}
                    onClick={() =>
                      void run(project.id, async () => {
                        const copy = await backend.duplicateProject(project.id);
                        navigate(`/projects/${copy.id}`);
                      })
                    }
                  >
                    Duplicate
                  </button>
                  <button
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
                      const restored = await backend.restoreProject(project.id);
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
    </section>
  );
}
