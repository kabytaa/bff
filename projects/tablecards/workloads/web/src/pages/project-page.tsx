import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Creator } from '../app';
import { useTableCardsApplication } from '../application-context';

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

  if (!projectId) {
    return (
      <p className="route-state notice error">The project was not found.</p>
    );
  }
  return (
    <Creator
      developmentControlsEnabled={developmentControlsEnabled}
      initialProjectId={projectId}
      initialStep={initialStep}
      onProjectSaved={(project) => {
        if (project.id !== projectId) {
          navigate(`/projects/${project.id}`, { replace: true });
        }
      }}
    />
  );
}
