/**
 * FMS Execution Engine
 * Pure logic for step transitions, dynamic TAT resolution, and branch evaluation.
 */

import { FmsDefinition, FmsStep, FmsFlowState, FmsStepInstanceRecord, TAT } from './types';
import { addWorkingTime, WorkingTimeConfig, DEFAULT_CONFIG } from '../../core/working-time/engine';

export function resolveTATWorkingHours(
  tat: TAT,
  formData: Record<string, any>,
  definition: FmsDefinition
): { hours: number; isAnytime: boolean } {
  if (tat.kind === 'ANYTIME') {
    return { hours: 0, isAnytime: true };
  }

  if (tat.kind === 'FIXED_HOURS') {
    return { hours: tat.hours, isAnytime: false };
  }

  if (tat.kind === 'FIXED_DAYS') {
    return { hours: tat.days * 9, isAnytime: false }; // 9 working hours per day
  }

  if (tat.kind === 'DYNAMIC') {
    const rawVal = formData[tat.field_key];
    const num = Number(rawVal) || 0;
    const hours = tat.unit === 'DAYS' ? num * 9 : num;
    return { hours, isAnytime: false };
  }

  return { hours: 0, isAnytime: true };
}

export function evaluateBranches(
  step: FmsStep,
  stepFormData: Record<string, any>
): 'NEXT' | 'CLOSE' | { goto_step: number } {
  if (step.branches && step.branches.length > 0) {
    for (const branch of step.branches) {
      const userVal = stepFormData[branch.when.field];
      if (String(userVal).trim().toLowerCase() === String(branch.when.equals).trim().toLowerCase()) {
        return branch.action;
      }
    }
  }

  return step.on_complete || 'NEXT';
}

export function calculateNextStepPlannedAt(
  completedAt: Date,
  nextStep: FmsStep,
  allFormData: Record<string, any>,
  definition: FmsDefinition,
  config: WorkingTimeConfig = DEFAULT_CONFIG
): { availableFrom: Date; plannedAt: Date } {
  const availableFrom = new Date(completedAt);
  const { hours, isAnytime } = resolveTATWorkingHours(nextStep.tat, allFormData, definition);

  if (isAnytime || hours === 0) {
    // Anytime tasks default to end of next working day or 24 working hours
    const plannedAt = addWorkingTime(availableFrom, 9, config);
    return { availableFrom, plannedAt };
  }

  const plannedAt = addWorkingTime(availableFrom, hours, config);
  return { availableFrom, plannedAt };
}
