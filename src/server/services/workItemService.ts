import { db } from '../db';
import { workingHoursBetween, getISTComponents, createDateFromIST } from '../../core/working-time/engine';
import { randomUUID } from 'crypto';

export interface CreateWorkItemDTO {
  source_module: 'checklist' | 'fms' | 'delegation';
  source_ref_id: string;
  fms_code?: string | null;
  step_no?: number | null;
  assignee_user_id: string;
  title_en: string;
  title_hi: string;
  is_important?: boolean;
  available_from: Date;
  planned_at: Date;
  task_type?: 'REPETITIVE' | 'FMS' | 'DELEGATION' | 'COMPLIANCE';
}

export interface CompleteWorkItemDTO {
  work_item_id: string;
  completed_by?: string;
  completed_at?: Date;
  is_admin_override?: boolean;
}

/**
 * Returns Monday of the week (IST) containing the date
 */
export function getMondayOfWeekIST(date: Date): string {
  const ist = getISTComponents(date);
  // Day: 0 = Sun, 1 = Mon, ..., 6 = Sat
  const day = ist.day === 0 ? 7 : ist.day; // treat Sun as 7
  const diffToMonday = day - 1;
  const mondayDate = createDateFromIST(ist.year, ist.month, ist.date - diffToMonday, 0, 0, 0);
  const mondayIst = getISTComponents(mondayDate);
  return mondayIst.dateStr;
}

/**
 * Helper to check if a task is locked based on 8:00 PM IST daily rule and no-yesterday rule
 */
export function isTaskSubmissionLocked(plannedAt: Date, asOfDate: Date = new Date()): { isLocked: boolean; reason?: string } {
  const nowIST = getISTComponents(asOfDate);
  const plannedIST = getISTComponents(plannedAt);

  // Rule 2: No yesterday task can be submitted
  if (nowIST.dateStr > plannedIST.dateStr) {
    return {
      isLocked: true,
      reason: "Yesterday's task is expired. Only today's tasks can be submitted before 8:00 PM.",
    };
  }

  // Rule 3: Daily deadline is 8:00 PM (20:00 IST)
  // If today and current hour >= 20 (8:00 PM)
  if (nowIST.dateStr === plannedIST.dateStr) {
    const timeInHours = nowIST.hours + nowIST.minutes / 60 + nowIST.seconds / 3600;
    if (timeInHours >= 20) {
      return {
        isLocked: true,
        reason: 'Task is locked. Daily task submission deadline is 8:00 PM (20:00 IST).',
      };
    }
  }

  return { isLocked: false };
}

export class WorkItemService {
  /**
   * Creates a new universal work item and registers its score event.
   */
  public static createWorkItem(dto: CreateWorkItemDTO): string {
    if (!dto.assignee_user_id) {
      throw new Error('Invariant violation: assignee_user_id is mandatory and must name a specific person.');
    }
    if (!dto.available_from || !dto.planned_at) {
      throw new Error('Invariant violation: available_from and planned_at can never be null.');
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const availableFromStr = dto.available_from.toISOString();
    const plannedAtStr = dto.planned_at.toISOString();
    const isImportantNum = dto.is_important ? 1 : 0;
    const weight = dto.is_important ? 3 : 1;
    const weekStartDate = getMondayOfWeekIST(dto.planned_at);
    // Derive task_type from source_module if not explicitly provided
    const taskType = dto.task_type || (
      dto.source_module === 'fms' ? 'FMS' :
      dto.source_module === 'delegation' ? 'DELEGATION' : 'REPETITIVE'
    );

    const insertWorkItem = db.prepare(`
      INSERT INTO work_items (
        id, source_module, source_ref_id, fms_code, step_no,
        assignee_user_id, title_en, title_hi, is_important,
        available_from, planned_at, status, created_at, task_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
    `);

    const insertScoreEvent = db.prepare(`
      INSERT INTO score_events (
        id, user_id, work_item_id, week_start_date, weight, is_done, is_on_time, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    `);

    db.transaction(() => {
      insertWorkItem.run(
        id,
        dto.source_module,
        dto.source_ref_id,
        dto.fms_code || null,
        dto.step_no || null,
        dto.assignee_user_id,
        dto.title_en,
        dto.title_hi,
        isImportantNum,
        availableFromStr,
        plannedAtStr,
        createdAt,
        taskType
      );

      insertScoreEvent.run(
        randomUUID(),
        dto.assignee_user_id,
        id,
        weekStartDate,
        weight,
        createdAt
      );
    })();

    return id;
  }

  /**
   * Records first opened timestamp for bottleneck analysis
   */
  public static markFirstOpened(workItemId: string): void {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE work_items 
      SET first_opened_at = ? 
      WHERE id = ? AND first_opened_at IS NULL
    `).run(now, workItemId);
  }

  /**
   * Completes a work item, enforcing strict daily 8:00 PM cutoff and no-yesterday submission rule.
   */
  public static completeWorkItem(dto: CompleteWorkItemDTO): void {
    const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(dto.work_item_id) as any;
    if (!item) {
      throw new Error(`Work item not found: ${dto.work_item_id}`);
    }

    const completedAt = dto.completed_at || new Date();
    const plannedAt = new Date(item.planned_at);

    // Rule Validation: unless manager override
    if (!dto.is_admin_override) {
      const isDailyChecklist = item.source_module === 'checklist' && item.task_type !== 'COMPLIANCE';
      if (isDailyChecklist) {
        const lockCheck = isTaskSubmissionLocked(plannedAt, completedAt);
        if (lockCheck.isLocked) {
          throw new Error(lockCheck.reason || 'Task submission is locked.');
        }
      }
    }

    const completedAtStr = completedAt.toISOString();
    const completedBy = dto.completed_by || item.assignee_user_id;

    const availableFrom = new Date(item.available_from);

    const queueWaitHours = workingHoursBetween(availableFrom, completedAt);
    const delayHours = workingHoursBetween(plannedAt, completedAt);
    const isOnTime = completedAt.getTime() <= plannedAt.getTime() ? 1 : 0;

    const updateWorkItem = db.prepare(`
      UPDATE work_items 
      SET status = 'DONE',
          completed_at = ?,
          completed_by = ?,
          queue_wait_hours = ?,
          delay_hours = ?
      WHERE id = ?
    `);

    const updateScoreEvent = db.prepare(`
      UPDATE score_events
      SET is_done = 1,
          is_on_time = ?,
          updated_at = ?
      WHERE work_item_id = ?
    `);

    db.transaction(() => {
      updateWorkItem.run(
        completedAtStr,
        completedBy,
        queueWaitHours,
        delayHours,
        dto.work_item_id
      );

      updateScoreEvent.run(
        isOnTime,
        completedAtStr,
        dto.work_item_id
      );
    })();
  }

  /**
   * Mandate Holder / Audit: Flag False on a work item
   */
  public static flagFalse(workItemId: string, flaggedBy: string, reason?: string): void {
    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare(`
        UPDATE work_items
        SET status = 'FLAGGED_FALSE',
            flagged_false_by = ?,
            flagged_false_reason = ?
        WHERE id = ?
      `).run(flaggedBy, reason || null, workItemId);

      db.prepare(`
        UPDATE score_events
        SET is_done = 0,
            is_on_time = 0,
            updated_at = ?
        WHERE work_item_id = ?
      `).run(now, workItemId);
    })();
  }

  /**
   * Mandate Holder / Admin Override: Mark missed work as done
   */
  public static overrideDone(workItemId: string, overrideBy: string): void {
    const now = new Date();
    const item = db.prepare('SELECT * FROM work_items WHERE id = ?').get(workItemId) as any;
    if (!item) return;

    const availableFrom = new Date(item.available_from);
    const plannedAt = new Date(item.planned_at);
    const queueWaitHours = workingHoursBetween(availableFrom, now);
    const delayHours = workingHoursBetween(plannedAt, now);

    db.transaction(() => {
      db.prepare(`
        UPDATE work_items
        SET status = 'DONE',
            completed_at = ?,
            completed_by = ?,
            queue_wait_hours = ?,
            delay_hours = ?
        WHERE id = ?
      `).run(now.toISOString(), overrideBy, queueWaitHours, delayHours, workItemId);

      // Invariant: Override missed item gets is_done = 1, but is_on_time = 0 permanently
      db.prepare(`
        UPDATE score_events
        SET is_done = 1,
            is_on_time = 0,
            updated_at = ?
        WHERE work_item_id = ?
      `).run(now.toISOString(), workItemId);
    })();
  }
}
