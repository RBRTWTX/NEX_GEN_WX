import { ModuleRegistry } from './module-registry';
import { coreModuleDefinitions } from './builtin/core-definitions';
import { graphicsModuleDefinitions } from './builtin/graphics-definitions';
import { mapModuleDefinitions } from './builtin/map-definitions';
import { weatherModuleDefinitions } from './builtin/weather-definitions';

export const moduleRegistry = new ModuleRegistry([
  ...coreModuleDefinitions,
  ...mapModuleDefinitions,
  ...weatherModuleDefinitions,
  ...graphicsModuleDefinitions,
]);

export const MODULES = moduleRegistry.definitions.map((definition) => definition.manifest);
export const getModule = (id: string) => moduleRegistry.get(id)?.manifest;
