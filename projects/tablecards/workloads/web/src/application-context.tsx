import { createContext, useContext, type PropsWithChildren } from 'react';

const ApplicationContext = createContext({
  developmentControlsEnabled: false,
});

export function TableCardsApplicationProvider({
  developmentControlsEnabled,
  children,
}: PropsWithChildren<{ readonly developmentControlsEnabled: boolean }>) {
  return (
    <ApplicationContext.Provider value={{ developmentControlsEnabled }}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useTableCardsApplication() {
  return useContext(ApplicationContext);
}
