import { createContext, useContext, type PropsWithChildren } from 'react';

const ApplicationContext = createContext<{
  developmentControlsEnabled: boolean;
  operations?: { apiBaseUrl: string; environmentKey: string };
}>({
  developmentControlsEnabled: false,
});

export function TableCardsApplicationProvider({
  developmentControlsEnabled,
  operations,
  children,
}: PropsWithChildren<{
  readonly developmentControlsEnabled: boolean;
  readonly operations?: { apiBaseUrl: string; environmentKey: string };
}>) {
  return (
    <ApplicationContext.Provider
      value={{ developmentControlsEnabled, operations }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useTableCardsApplication() {
  return useContext(ApplicationContext);
}
