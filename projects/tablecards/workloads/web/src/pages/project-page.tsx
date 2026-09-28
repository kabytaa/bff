import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Creator } from '../app';
import { useTableCardsApplication } from '../application-context';
import type { ExportStatus } from '../backend';
import { useTableCardsBackend } from '../use-tablecards-backend';

export function Component() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { developmentControlsEnabled } = useTableCardsApplication();
  const backend = useTableCardsBackend();
  const [latestExport, setLatestExport] = useState<ExportStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void backend
      .getLatestExport(projectId)
      .then(setLatestExport)
      .catch(() => setLatestExport(null));
  }, [backend, projectId]);

  if (!projectId) {
    return (
      <p className="route-state notice error">The project was not found.</p>
    );
  }
  return (
    <>
      <section className="saved-project-actions" aria-label="Project actions">
        <div>
          <strong>Saved project</strong>
          <span>Save changes before duplicating or archiving.</span>
        </div>
        <div className="inline-actions wrap">
          {latestExport?.status === 'ready' && latestExport.storageUrl ? (
            <a
              className="secondary-button"
              href={latestExport.storageUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download latest PDF
            </a>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void backend
                .duplicateProject(projectId)
                .then((copy) => navigate(`/projects/${copy.id}`))
                .catch((caught: unknown) =>
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : 'The project could not be duplicated.',
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm('Archive this project?')) return;
              setBusy(true);
              setError(null);
              void backend
                .archiveProject(projectId)
                .then(() => navigate('/projects'))
                .catch((caught: unknown) =>
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : 'The project could not be archived.',
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            Archive
          </button>
        </div>
      </section>
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
      <Creator
        developmentControlsEnabled={developmentControlsEnabled}
        initialProjectId={projectId}
        onProjectSaved={(project) => {
          if (project.id !== projectId) {
            navigate(`/projects/${project.id}`, { replace: true });
          }
        }}
      />
    </>
  );
}
