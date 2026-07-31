import { emitTo, listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { StudioBranding, StudioScene, TransitionState } from '../types/domain';
import { sceneRenderSignature } from '../rendering/render-signature';

const SCENE_CHANNEL_NAME = 'nex-gen-wx-scene-output-v2';
const CONTROL_CHANNEL_NAME = 'nex-gen-wx-output-control-v2';
const SCENE_EVENT_NAME = 'nexgenwx://scene-state-v2';
const CONTROL_EVENT_NAME = 'nexgenwx://output-control-v2';

export interface SceneMessage {
  kind: 'scene';
  scene: StudioScene;
  branding: StudioBranding;
  transition: TransitionState;
  renderId: string;
  signature: string;
  sequence: number;
  sentAt: string;
}

export interface OutputAcknowledgement {
  kind: 'ack';
  renderId: string;
  sceneId: string;
  signature: string;
  width: number;
  height: number;
  ready: boolean;
  detail: string;
  acknowledgedAt: string;
}

export interface OutputSyncRequest {
  kind: 'sync-request';
  requestedAt: string;
}

export type OutputControlMessage = OutputAcknowledgement | OutputSyncRequest;

export class OutputBridge {
  private readonly sceneChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(SCENE_CHANNEL_NAME)
    : null;
  private readonly controlChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(CONTROL_CHANNEL_NAME)
    : null;
  private sequence = 0;
  private lastPublished: SceneMessage | null = null;

  async publish(scene: StudioScene, branding: StudioBranding): Promise<SceneMessage> {
    this.sequence += 1;
    const message: SceneMessage = {
      kind: 'scene',
      scene,
      branding,
      transition: scene.transition,
      renderId: `${Date.now().toString(36)}-${this.sequence.toString(36)}`,
      signature: sceneRenderSignature(scene, branding),
      sequence: this.sequence,
      sentAt: new Date().toISOString(),
    };
    this.lastPublished = message;
    this.sceneChannel?.postMessage(message);
    try {
      await emitTo('output', SCENE_EVENT_NAME, message);
    } catch {
      // Browser-only development or the output window is not available yet.
    }
    return message;
  }

  async republishLatest(): Promise<SceneMessage | null> {
    const message = this.lastPublished;
    if (!message) return null;
    this.sceneChannel?.postMessage(message);
    try {
      await emitTo('output', SCENE_EVENT_NAME, message);
    } catch {
      // Browser-only development.
    }
    return message;
  }

  async subscribe(handler: (message: SceneMessage) => void): Promise<() => void> {
    const onBroadcast = (event: MessageEvent<SceneMessage>) => {
      if (event.data?.kind === 'scene') handler(event.data);
    };
    this.sceneChannel?.addEventListener('message', onBroadcast);

    let unlisten: UnlistenFn | undefined;
    try {
      unlisten = await listen<SceneMessage>(SCENE_EVENT_NAME, (event) => handler(event.payload));
    } catch {
      // Browser-only development.
    }

    return () => {
      this.sceneChannel?.removeEventListener('message', onBroadcast);
      unlisten?.();
    };
  }

  async acknowledge(message: OutputAcknowledgement): Promise<void> {
    this.controlChannel?.postMessage(message);
    try {
      await emitTo('main', CONTROL_EVENT_NAME, message);
    } catch {
      // Browser-only development.
    }
  }

  async requestSync(): Promise<void> {
    const message: OutputSyncRequest = { kind: 'sync-request', requestedAt: new Date().toISOString() };
    this.controlChannel?.postMessage(message);
    try {
      await emitTo('main', CONTROL_EVENT_NAME, message);
    } catch {
      // Browser-only development.
    }
  }

  async subscribeControls(handler: (message: OutputControlMessage) => void): Promise<() => void> {
    const onBroadcast = (event: MessageEvent<OutputControlMessage>) => handler(event.data);
    this.controlChannel?.addEventListener('message', onBroadcast);

    let unlisten: UnlistenFn | undefined;
    try {
      unlisten = await listen<OutputControlMessage>(CONTROL_EVENT_NAME, (event) => handler(event.payload));
    } catch {
      // Browser-only development.
    }

    return () => {
      this.controlChannel?.removeEventListener('message', onBroadcast);
      unlisten?.();
    };
  }

  close(): void {
    this.sceneChannel?.close();
    this.controlChannel?.close();
  }
}

export const outputBridge = new OutputBridge();
