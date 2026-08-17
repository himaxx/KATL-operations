import { FmsDefinition } from '../_framework/types';

export const jobSlipFms: FmsDefinition = {
  code: 'JS',
  name: {
    en: 'Job Slip (Production)',
    hi: 'जॉब स्लिप (उत्पादन)',
  },
  description: {
    en: 'Job work tracking from cutting, contractor stitching, pressing to finished receipt.',
    hi: 'कटिंग, ठेकेदार सिलाई, प्रेस और फिनिश्ड माल आवक ट्रैकिंग।',
  },
  steps: [
    {
      step_no: 1,
      label: { en: 'Naame Entry (Issuance)', hi: 'नामे एंट्री (कटिंग जारी)' },
      assignee: { type: 'DESIGNATION', designation_id: 'Production Executive' },
      is_important: true,
      tat: { kind: 'ANYTIME' },
      questions: [
        {
          key: 'challan_no',
          label: { en: 'Challan / Gate Pass Number', hi: 'चालान / गेट पास नंबर' },
          type: 'text',
          required: true,
        },
        {
          key: 'item_name',
          label: { en: 'Item / Design Number', hi: 'आइटम / डिज़ाइन नंबर' },
          type: 'text',
          required: true,
        },
        {
          key: 'total_pieces',
          label: { en: 'Total Pieces', hi: 'कुल पीस' },
          type: 'number',
          required: true,
        },
        {
          key: 'thekedar_name',
          label: { en: 'Thekedar / Contractor Name', hi: 'ठेकेदार का नाम' },
          type: 'master_list',
          master_list_key: 'thekedars',
          required: true,
        },
        {
          key: 'lead_time_days',
          label: { en: 'Lead Time (Days)', hi: 'समय (दिन)' },
          type: 'number',
          required: true,
        },
        {
          key: 'cut_to_pack',
          label: { en: 'Cut to Pack? (Direct finished)', hi: 'कट टू पैक? (सीधा फिनिश्ड)' },
          type: 'select',
          options: ['No', 'Yes'],
          required: true,
        },
      ],
      branches: [
        // If Cut-to-Pack is Yes, skip intermediate Unfinished & Press steps and go directly to Step 4 (Finished Maal Jama)
        {
          when: { field: 'cut_to_pack', equals: 'Yes' },
          action: { goto_step: 4 },
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 2,
      label: { en: 'Unfinished Maal Jama', hi: 'कच्चा माल जमा (सिलाई आवक)' },
      assignee: { type: 'DESIGNATION', designation_id: 'Production Executive' },
      is_important: true,
      tat: {
        kind: 'DYNAMIC',
        from_step: 1,
        field_key: 'lead_time_days',
        unit: 'DAYS',
      },
      visible_data: ['challan_no', 'item_name', 'total_pieces', 'thekedar_name'],
      questions: [
        {
          key: 'jama_pieces',
          label: { en: 'Received Unfinished Pieces', hi: 'प्राप्त कच्चे पीस' },
          type: 'number',
          required: true,
        },
        {
          key: 'shortage_pieces',
          label: { en: 'Shortage / Rejection Pieces', hi: 'शॉर्टेज / रिजेक्ट' },
          type: 'number',
          required: false,
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 3,
      label: { en: 'Press & Ironing', hi: 'प्रेस व फिनिशिंग' },
      assignee: { type: 'DESIGNATION', designation_id: 'Production Executive' },
      is_important: false,
      tat: { kind: 'FIXED_DAYS', days: 2 }, // 18 working hours
      visible_data: ['item_name', 'jama_pieces', 'thekedar_name'],
      questions: [
        {
          key: 'pressman_name',
          label: { en: 'Pressman Name', hi: 'प्रेसमैन का नाम' },
          type: 'master_list',
          master_list_key: 'pressmen',
          required: true,
        },
        {
          key: 'pressed_pieces',
          label: { en: 'Pressed Pieces Count', hi: 'प्रेस हुए पीस' },
          type: 'number',
          required: true,
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 4,
      label: { en: 'Finished Maal Inward', hi: 'फिनिश्ड माल आवक' },
      assignee: { type: 'DESIGNATION', designation_id: 'Warehouse Executive' },
      is_important: true,
      tat: { kind: 'FIXED_DAYS', days: 2 },
      visible_data: ['challan_no', 'item_name', 'total_pieces', 'thekedar_name'],
      questions: [
        {
          key: 'finished_received_qty',
          label: { en: 'Final Finished Quantity Stored', hi: 'वेयरहाउस में जमा कुल पीस' },
          type: 'number',
          required: true,
        },
        {
          key: 'warehouse_location',
          label: { en: 'Warehouse Rack / Shelf Location', hi: 'रैक / स्थान' },
          type: 'text',
          required: false,
        },
      ],
      on_complete: 'CLOSE',
    },
  ],
};
