import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Creator } from '../app';
import { useTableCardsApplication } from '../application-context';
import { safeProductMessage } from '../product-error';
import { useTableCardsBackend } from '../use-tablecards-backend';

export function Component() {
  const { projectId } = useParams();
  const routeState: unknown = useLocation().state;
  const initialStep =
    typeof routeState === 'object' &&
    routeState !== null &&
    'creatorStep' in routeState &&
    routeState.creatorStep === 3
      ? 3
      : 1;
  const navigate = useNavigate();
  const { developmentControlsEnabled } = useTableCardsApplication();
  const backend = useTableCardsBackend();
  const [draftState, setDraftState] = useState({
    dirty: false,
    unavailable: false,
    loading: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <span>
            {draftState.unavailable
              ? 'Project unavailable in this workspace.'
              : draftState.dirty
                ? 'Save your unsaved changes before duplicating or archiving.'
                : 'Duplicate or archive this saved version.'}
          </span>
        </div>
        <div className="inline-actions wrap">
          <button
            className="secondary-button"
            type="button"
            disabled={
              busy ||
              draftState.dirty ||
              draftState.unavailable ||
              draftState.loading
            }
            onClick={() => {
              setBusy(true);
              setError(null);
              void backend
                .duplicateProject(projectId)
                .then((copy) => navigate(`/projects/${copy.id}`))
                .catch((caught: unknown) =>
                  setError(
                    safeProductMessage(
                      caught,
                      'The project could not be duplicated.',
                    ),
                  ),
                )
                .finally(() => setBusy(false));
            }}
          >
            Duplicate
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={
              busy ||
              draftState.dirty ||
              draftState.unavailable ||
              draftState.loading
            }
            onClick={() => {
              if (!window.confirm('Archive this project?')) return;
              setBusy(true);
              setError(null);
              void backend
                .archiveProject(projectId)
                .then(() => navigate('/projects'))
                .catch((caught: unknown) =>
                  setError(
                    safeProductMessage(
                      caught,
                      'The project could not be archived.',
                    ),
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
        initialStep={initialStep}
        onDraftStateChange={setDraftState}
        onProjectSaved={(project) => {
          if (project.id !== projectId) {
            navigate(`/projects/${project.id}`, { replace: true });
          }
        }}
      />
    </>
  );
}
