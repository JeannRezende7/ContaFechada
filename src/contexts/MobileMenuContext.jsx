import { createContext, useContext } from 'react';

const MobileMenuContext = createContext({ openMenu: () => {} });

export function MobileMenuProvider({ openMenu, children }) {
  return (
    <MobileMenuContext.Provider value={{ openMenu }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}
