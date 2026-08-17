/**
 * FMS Registry - Auto-discovery & module storage
 * Adheres strictly to Law 1 (Module Isolation).
 */

import { FmsDefinition } from './types';

class FmsRegistry {
  private definitions = new Map<string, FmsDefinition>();

  public register(def: FmsDefinition): void {
    if (this.definitions.has(def.code)) {
      console.warn(`[FMS Registry] Overwriting FMS definition: ${def.code}`);
    }
    this.definitions.set(def.code, def);
  }

  public get(code: string): FmsDefinition | undefined {
    return this.definitions.get(code);
  }

  public getAll(): FmsDefinition[] {
    return Array.from(this.definitions.values());
  }
}

export const fmsRegistry = new FmsRegistry();
