/**
 * FMS Framework Types
 * Strictly isolates flow definitions from framework runtime logic.
 */

export type TAT =
  | { kind: 'ANYTIME' }
  | { kind: 'FIXED_HOURS'; hours: number }
  | { kind: 'FIXED_DAYS'; days: number }
  | { kind: 'DYNAMIC'; from_step: number; field_key: string; unit: 'HOURS' | 'DAYS' };

export type QuestionType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'file' | 'master_list';

export interface Question {
  key: string;
  label: { en: string; hi: string };
  type: QuestionType;
  options?: string[]; // For select type
  master_list_key?: string; // For master_list type, e.g. 'customers', 'thekedars'
  required: boolean;
  placeholder?: { en: string; hi: string };
}

export interface BranchCondition {
  field: string;
  equals: string | number | boolean;
}

export interface Branch {
  when: BranchCondition;
  action: 'CLOSE' | { goto_step: number };
}

export interface RepeatConfig {
  quantity_field: string;
  target_field: { from_step: number; key: string };
  auto_complete_at_percent: number; // e.g. 85
  requires_settlement: boolean;
}

export interface FmsStep {
  step_no: number;
  label: { en: string; hi: string }; // "What"
  assignee: 
    | { type: 'USER'; user_id: string }
    | { type: 'DESIGNATION'; designation_id: string } // For step 1 open-entry
    | { type: 'DYNAMIC_USER'; from_step: number; field_key: string }
    | { type: 'DIRECT_USER_PHONE'; phone: string; name: string }
    | { type: 'SHARED_USERS'; users: Array<{ phone: string; name: string }> };
  is_important: boolean; // 3x weight
  tat: TAT; // "When"
  questions: Question[]; // The form
  visible_data?: string[]; // Field keys from earlier steps to show
  repeatable?: RepeatConfig;
  branches?: Branch[];
  on_complete?: 'NEXT' | { goto_step: number } | 'CLOSE';
  whatsapp_template?: {
    template_key: string;
    recipient_type: 'CUSTOMER' | 'AGENT' | 'BOTH';
  };
}

export interface FmsDefinition {
  code: string; // e.g. 'O2D', 'PUR', 'JS'
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  steps: FmsStep[];
  enable_bill_sequence_tracking?: boolean;
}

export interface FmsFlowState {
  id: string;
  fms_code: string;
  display_number: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DELETED';
  current_step: number;
  started_by: string;
  started_at: Date;
  completed_at?: Date | null;
  step_instances: FmsStepInstanceRecord[];
  all_form_data: Record<string, any>;
  settled_by?: string | null;
  settled_at?: Date | null;
}

export interface FmsStepInstanceRecord {
  id: string;
  flow_id: string;
  step_no: number;
  repeat_index: number;
  assignee_user_id: string;
  work_item_id?: string;
  status: 'OPEN' | 'DONE';
  form_data: Record<string, any>;
  available_from: Date;
  planned_at: Date;
  completed_at?: Date | null;
  completed_by?: string | null;
}
