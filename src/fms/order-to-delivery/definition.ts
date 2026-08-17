import { FmsDefinition } from '../_framework/types';

export const orderToDeliveryFms: FmsDefinition = {
  code: 'O2D',
  name: {
    en: 'Order-to-Delivery',
    hi: 'ऑर्डर से डिलीवरी',
  },
  description: {
    en: 'End-to-end sales order processing, staggered batch dispatching, and settlement.',
    hi: 'बिक्री आदेश प्रसंस्करण, डिस्पैच और सेटलमेंट फ्लो।',
  },
  enable_bill_sequence_tracking: true,
  steps: [
    {
      step_no: 1,
      label: {
        en: 'Order Entry',
        hi: 'ऑर्डर एंट्री',
      },
      assignee: { type: 'DESIGNATION', designation_id: 'Order Data Executive' },
      is_important: true,
      tat: { kind: 'ANYTIME' },
      questions: [
        {
          key: 'customer_name',
          label: { en: 'Customer Name', hi: 'ग्राहक का नाम' },
          type: 'master_list',
          master_list_key: 'customers',
          required: true,
        },
        {
          key: 'product_ordered',
          label: { en: 'Product Ordered', hi: 'ऑर्डर किया गया माल / आइटम' },
          type: 'text',
          required: true,
        },
        {
          key: 'quantity',
          label: { en: 'Total Quantity (Pcs)', hi: 'कुल मात्रा (पीस)' },
          type: 'number',
          required: true,
        },
        {
          key: 'order_type',
          label: { en: 'Order Type', hi: 'ऑर्डर प्रकार' },
          type: 'select',
          options: ['Ready Stock', 'Fresh Production', 'Sample / Test'],
          required: true,
        },
        {
          key: 'lead_time_days',
          label: { en: 'Lead Time (Days)', hi: 'डिलीवरी समय (दिन)' },
          type: 'number',
          required: true,
        },
        {
          key: 'transport',
          label: { en: 'Transport Name', hi: 'ट्रांसपोर्ट का नाम' },
          type: 'master_list',
          master_list_key: 'transports',
          required: false,
        },
        {
          key: 'agent_name',
          label: { en: 'Agent Name', hi: 'एजेंट का नाम' },
          type: 'master_list',
          master_list_key: 'agents',
          required: false,
        },
        {
          key: 'special_requirements',
          label: { en: 'Special Requirements / Notes', hi: 'विशेष निर्देश' },
          type: 'text',
          required: false,
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 2,
      label: {
        en: 'Dispatch Entry',
        hi: 'डिस्पैच एंट्री',
      },
      assignee: { type: 'DESIGNATION', designation_id: 'Warehouse Executive' },
      is_important: true,
      tat: {
        kind: 'DYNAMIC',
        from_step: 1,
        field_key: 'lead_time_days',
        unit: 'DAYS',
      },
      visible_data: ['customer_name', 'product_ordered', 'quantity', 'lead_time_days', 'transport'],
      repeatable: {
        quantity_field: 'qty_dispatched',
        target_field: { from_step: 1, key: 'quantity' },
        auto_complete_at_percent: 85,
        requires_settlement: true,
      },
      questions: [
        {
          key: 'bill_no',
          label: { en: 'Bill / Challan Number', hi: 'बिल / चालान नंबर' },
          type: 'text',
          required: true,
        },
        {
          key: 'qty_dispatched',
          label: { en: 'Dispatched Quantity (Pcs)', hi: 'डिस्पैच की गई मात्रा (पीस)' },
          type: 'number',
          required: true,
        },
        {
          key: 'vehicle_docket_no',
          label: { en: 'Vehicle / Docket Number', hi: 'गाड़ी / डॉकेट नंबर' },
          type: 'text',
          required: false,
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 3,
      label: {
        en: 'Complete & Settle Order',
        hi: 'ऑर्डर सेटल व बंद करें',
      },
      assignee: { type: 'DESIGNATION', designation_id: 'CEO' },
      is_important: false,
      tat: { kind: 'FIXED_DAYS', days: 30 }, // 270 working hours per PRD
      visible_data: ['customer_name', 'product_ordered', 'quantity'],
      questions: [
        {
          key: 'settlement_status',
          label: { en: 'Settlement Status', hi: 'सेटलमेंट स्थिति' },
          type: 'select',
          options: ['100% Dispatched & Closed', 'Short Closed with Approval', 'Returned / Disputed'],
          required: true,
        },
        {
          key: 'settlement_notes',
          label: { en: 'Settlement Remarks', hi: 'टिप्पणी' },
          type: 'text',
          required: false,
        },
      ],
      on_complete: 'CLOSE',
    },
  ],
};
