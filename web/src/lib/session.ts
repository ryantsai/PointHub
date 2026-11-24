import { createContext, useContext } from 'react';
import type { Me } from '../api/types';

export const SessionContext = createContext<Me | null>(null);

/** The signed-in employee. Only valid below <RequireAuth>, which guarantees it is set. */
export function useSession(): Me {
  const me = useContext(SessionContext);
  if (!me) throw new Error('useSession must be used inside <RequireAuth>');
  return me;
}
