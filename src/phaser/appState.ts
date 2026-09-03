import { ProgressManager } from '../core/progress';
import { AudioManager } from './managers/AudioManager';

/**
 * App-lifetime singletons shared across scenes: persisted progress and the
 * audio engine. Both are cheap, stateful, and meant to outlive any single
 * scene, so they live here rather than being re-created per scene.
 */
export const progressManager = new ProgressManager();
export const audioManager = new AudioManager();
audioManager.configure(progressManager.settings);

export let activeLevel = 1;

export function setActiveLevel(level: number): void {
  activeLevel = level;
}
