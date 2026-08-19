/**
 * O2C Automated Scheduler & Background Task Manager
 * Handles time-based step surfacing (Step 8 lead time, Step 12 pre-due, Step 13 D-Day)
 */

import { db } from '../db';
import { WorkItemService } from './workItemService';
import { fmsRegistry } from '../../fms';
import { randomUUID } from 'crypto';

export class O2CScheduler {
  public static checkAndCreateScheduledTasks(): void {
    try {
      const activeFlows = db.prepare(`
        SELECT * FROM fms_flow_instances 
        WHERE fms_code = 'O2C' AND status = 'ACTIVE'
      `).all() as any[];

      const def = fmsRegistry.get('O2C');
      if (!def) return;

      const now = new Date();

      for (const flow of activeFlows) {
        const formData = typeof flow.all_form_data === 'string'
          ? JSON.parse(flow.all_form_data || '{}')
          : (flow.all_form_data || {});

        // ----------------------------------------------------
        // Check Step 12 (Pre-Due Reminder)
        // ----------------------------------------------------
        if (flow.current_step === 12) {
          const step12Exists = db.prepare(`
            SELECT id FROM fms_step_instances 
            WHERE flow_id = ? AND step_no = 12 AND status = 'OPEN'
          `).get(flow.id);

          if (!step12Exists && formData.payment_due_date) {
            const dueDate = new Date(formData.payment_due_date);
            const termsDays = Number(formData.payment_terms_days) || 30;
            const daysBefore = Math.max(1, Math.round(termsDays * 0.2)); // 20% of term
            const triggerDate = new Date(dueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

            if (now >= triggerDate) {
              const step12Def = def.steps.find((s) => s.step_no === 12);
              if (step12Def) {
                // Find Lalita's user id
                const user = db.prepare('SELECT id FROM users WHERE mobile = ? OR name LIKE ?').get('9009200757', '%Lalita%') as any;
                if (user) {
                  const workId = WorkItemService.createWorkItem({
                    source_module: 'fms',
                    source_ref_id: flow.id,
                    fms_code: 'O2C',
                    step_no: 12,
                    assignee_user_id: user.id,
                    title_en: `[${flow.display_number}] ${step12Def.label.en}`,
                    title_hi: `[${flow.display_number}] ${step12Def.label.hi}`,
                    is_important: step12Def.is_important,
                    available_from: now,
                    planned_at: dueDate,
                  });

                  db.prepare(`
                    INSERT INTO fms_step_instances (
                      id, flow_id, step_no, repeat_index, assignee_user_id, work_item_id, status, form_data, available_from, planned_at
                    ) VALUES (?, ?, 12, 0, ?, ?, 'OPEN', '{}', ?, ?)
                  `).run(randomUUID(), flow.id, user.id, workId, now.toISOString(), dueDate.toISOString());
                }
              }
            }
          }
        }

        // ----------------------------------------------------
        // Check Step 13 (D-Day Due Today)
        // ----------------------------------------------------
        if (flow.current_step === 13) {
          const step13Exists = db.prepare(`
            SELECT id FROM fms_step_instances 
            WHERE flow_id = ? AND step_no = 13 AND status = 'OPEN'
          `).get(flow.id);

          if (!step13Exists && formData.payment_due_date) {
            const dueDate = new Date(formData.payment_due_date);
            if (now >= dueDate) {
              const step13Def = def.steps.find((s) => s.step_no === 13);
              if (step13Def) {
                const user = db.prepare('SELECT id FROM users WHERE mobile = ? OR name LIKE ?').get('9009200757', '%Lalita%') as any;
                if (user) {
                  const workId = WorkItemService.createWorkItem({
                    source_module: 'fms',
                    source_ref_id: flow.id,
                    fms_code: 'O2C',
                    step_no: 13,
                    assignee_user_id: user.id,
                    title_en: `[${flow.display_number}] ${step13Def.label.en}`,
                    title_hi: `[${flow.display_number}] ${step13Def.label.hi}`,
                    is_important: step13Def.is_important,
                    available_from: now,
                    planned_at: now,
                  });

                  db.prepare(`
                    INSERT INTO fms_step_instances (
                      id, flow_id, step_no, repeat_index, assignee_user_id, work_item_id, status, form_data, available_from, planned_at
                    ) VALUES (?, ?, 13, 0, ?, ?, 'OPEN', '{}', ?, ?)
                  `).run(randomUUID(), flow.id, user.id, workId, now.toISOString(), now.toISOString());
                }
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('[O2C Scheduler] Error checking tasks:', err.message);
    }
  }
}
