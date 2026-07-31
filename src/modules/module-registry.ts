import type { MapController } from '../map/controllers/controller-types';
import type { StudioProject, StudioScene } from '../types/domain';
import type {
  ModuleDialogContribution,
  ModuleMapControllerContribution,
  ModuleMapControllerFactoryContext,
  ModuleProviderContribution,
  ModuleSettingsTabContribution,
  ModuleToolContribution,
  StudioModuleDefinition,
} from '../types/module';

const MAP_PHASE_ORDER = {
  foundation: 0,
  data: 1,
  interaction: 2,
  finalize: 3,
} as const;

function byOrder<T extends { order?: number }>(left: T, right: T): number {
  return (left.order ?? 0) - (right.order ?? 0);
}

export class ModuleRegistry {
  private readonly definitionsById = new Map<string, StudioModuleDefinition>();
  private readonly orderedDefinitions: StudioModuleDefinition[];

  constructor(definitions: StudioModuleDefinition[]) {
    for (const definition of definitions) {
      const id = definition.manifest.id.trim();
      if (!id) throw new Error('A module definition has an empty id.');
      if (this.definitionsById.has(id)) throw new Error(`Duplicate module id: ${id}`);
      this.definitionsById.set(id, definition);
    }
    for (const definition of definitions) {
      for (const dependency of definition.manifest.dependencies) {
        if (!this.definitionsById.has(dependency)) {
          throw new Error(`Module ${definition.manifest.id} depends on missing module ${dependency}.`);
        }
      }
    }
    this.orderedDefinitions = this.sortByDependencies(definitions);
    this.assertContributionIds();
  }

  get definitions(): readonly StudioModuleDefinition[] {
    return this.orderedDefinitions;
  }

  get(id: string): StudioModuleDefinition | undefined {
    return this.definitionsById.get(id);
  }

  require(id: string): StudioModuleDefinition {
    const definition = this.get(id);
    if (!definition) throw new Error(`Unknown module: ${id}`);
    return definition;
  }

  isActive(id: string, scene: StudioScene): boolean {
    return this.resolveSceneModuleIds(scene).has(id);
  }

  resolveSceneModuleIds(scene: StudioScene): ReadonlySet<string> {
    const active = new Set<string>();
    const visit = (id: string) => {
      if (active.has(id)) return;
      const definition = this.definitionsById.get(id);
      if (!definition) return;
      active.add(id);
      definition.manifest.dependencies.forEach(visit);
    };

    for (const id of scene.activeModuleIds) visit(id);
    for (const definition of this.orderedDefinitions) {
      if (definition.isActiveForScene?.(scene)) visit(definition.manifest.id);
    }
    return active;
  }

  getProviders(): ModuleProviderContribution[] {
    return this.orderedDefinitions.flatMap((definition) => definition.providers ?? []);
  }

  getSettingsTabs(scene: StudioScene): ModuleSettingsTabContribution[] {
    const active = this.resolveSceneModuleIds(scene);
    return this.orderedDefinitions
      .flatMap((definition) => (definition.settingsTabs ?? []).map((tab) => ({ definition, tab })))
      .filter(({ definition, tab }) => (
        tab.sceneKinds.includes(scene.kind)
        && (!tab.requiresActiveModule || active.has(definition.manifest.id))
      ))
      .map(({ tab }) => tab)
      .sort(byOrder);
  }

  getDialog(id: string, scene: StudioScene): ModuleDialogContribution | undefined {
    const active = this.resolveSceneModuleIds(scene);
    for (const definition of this.orderedDefinitions) {
      const dialog = definition.dialogs?.find((candidate) => candidate.id === id);
      if (!dialog) continue;
      if (dialog.sceneKinds && !dialog.sceneKinds.includes(scene.kind)) return undefined;
      if (dialog.requiresActiveModule && !active.has(definition.manifest.id)) return undefined;
      return dialog;
    }
    return undefined;
  }

  getTools(scene: StudioScene, placement?: ModuleToolContribution['placement']): ModuleToolContribution[] {
    const active = this.resolveSceneModuleIds(scene);
    return this.orderedDefinitions
      .flatMap((definition) => (definition.tools ?? []).map((tool) => ({ definition, tool })))
      .filter(({ definition, tool }) => (
        (!placement || tool.placement === placement)
        && tool.sceneKinds.includes(scene.kind)
        && (!tool.requiresActiveModule || active.has(definition.manifest.id))
      ))
      .map(({ tool }) => tool)
      .sort(byOrder);
  }

  normalizeProjectModuleState(project: StudioProject): StudioProject {
    let changed = false;
    const scenes = project.scenes.map((scene) => {
      const normalized = this.normalizeSceneModuleState(scene);
      if (normalized !== scene) changed = true;
      return normalized;
    });
    return changed ? { ...project, scenes } : project;
  }

  normalizeSceneModuleState(scene: StudioScene): StudioScene {
    const active = this.resolveSceneModuleIds(scene);
    let moduleState = scene.moduleState ?? {};
    let changed = scene.moduleState == null;

    for (const definition of this.orderedDefinitions) {
      if (!active.has(definition.manifest.id)) continue;
      const existing = moduleState[definition.manifest.id];
      if (!existing && !definition.defaultSceneState && !definition.migrateSceneState) continue;
      const current = existing ?? definition.defaultSceneState ?? {};
      const migrated = definition.migrateSceneState
        ? definition.migrateSceneState({ ...current }, scene)
        : { ...current };
      if (!existing || JSON.stringify(existing) !== JSON.stringify(migrated)) {
        moduleState = { ...moduleState, [definition.manifest.id]: migrated };
        changed = true;
      }
    }

    return changed ? { ...scene, moduleState } : scene;
  }

  createMapControllers(): MapController[] {
    const controllers = new Map<string, MapController>();
    const services = new Map<string, unknown>();
    const context: ModuleMapControllerFactoryContext = {
      getController: <T extends MapController = MapController>(id: string) => controllers.get(id) as T | undefined,
      requireController: <T extends MapController = MapController>(id: string) => {
        const controller = controllers.get(id);
        if (!controller) throw new Error(`Map controller ${id} is required before it is created.`);
        return controller as T;
      },
      setService: <T,>(id: string, value: T) => services.set(id, value),
      getService: <T,>(id: string) => services.get(id) as T | undefined,
    };

    const contributions = this.orderedDefinitions
      .flatMap((definition) => (definition.mapControllers ?? []).map((contribution) => ({ definition, contribution })))
      .sort((left, right) => {
        const phase = MAP_PHASE_ORDER[left.contribution.phase] - MAP_PHASE_ORDER[right.contribution.phase];
        return phase || left.contribution.order - right.contribution.order;
      });

    for (const { definition, contribution } of contributions) {
      if (controllers.has(contribution.id)) {
        throw new Error(`Duplicate map controller contribution ${contribution.id} from ${definition.manifest.id}.`);
      }
      const controller = contribution.create(context);
      if (controller.id !== contribution.id) {
        throw new Error(
          `Module ${definition.manifest.id} registered map controller ${contribution.id}, but created ${controller.id}.`,
        );
      }
      controllers.set(controller.id, controller);
    }
    return [...controllers.values()];
  }

  private sortByDependencies(definitions: StudioModuleDefinition[]): StudioModuleDefinition[] {
    const result: StudioModuleDefinition[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (definition: StudioModuleDefinition) => {
      const id = definition.manifest.id;
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Circular module dependency involving ${id}.`);
      visiting.add(id);
      for (const dependency of definition.manifest.dependencies) visit(this.require(dependency));
      visiting.delete(id);
      visited.add(id);
      result.push(definition);
    };

    definitions.forEach(visit);
    return result;
  }

  private assertContributionIds(): void {
    const providerIds = new Set<string>();
    const dialogIds = new Set<string>();
    const settingsIds = new Set<string>();
    const toolIds = new Set<string>();
    const controllerIds = new Set<string>();

    const unique = (set: Set<string>, id: string, type: string) => {
      if (set.has(id)) throw new Error(`Duplicate ${type} contribution id: ${id}`);
      set.add(id);
    };

    for (const definition of this.orderedDefinitions) {
      definition.providers?.forEach((item) => unique(providerIds, item.id, 'provider'));
      definition.dialogs?.forEach((item) => unique(dialogIds, item.id, 'dialog'));
      definition.settingsTabs?.forEach((item) => unique(settingsIds, item.id, 'settings tab'));
      definition.tools?.forEach((item) => unique(toolIds, item.id, 'tool'));
      definition.mapControllers?.forEach((item: ModuleMapControllerContribution) => unique(controllerIds, item.id, 'map controller'));
    }
  }
}
