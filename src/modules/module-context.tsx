import { createContext, useContext, type ReactNode } from 'react';
import { moduleRegistry } from './registry';
import type { ModuleRegistry } from './module-registry';

const ModuleRegistryContext = createContext<ModuleRegistry | null>(null);

export function ModuleRegistryProvider({
  children,
  registry = moduleRegistry,
}: {
  children: ReactNode;
  registry?: ModuleRegistry;
}) {
  return (
    <ModuleRegistryContext.Provider value={registry}>
      {children}
    </ModuleRegistryContext.Provider>
  );
}

export function useModuleRegistry(): ModuleRegistry {
  const registry = useContext(ModuleRegistryContext);
  if (!registry) throw new Error('useModuleRegistry must be used inside ModuleRegistryProvider');
  return registry;
}
