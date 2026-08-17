import { FmsDefinition } from '../_framework/types';

export const purchaseFms: FmsDefinition = {
  code: 'PUR',
  name: {
    en: 'Purchase Flow',
    hi: 'खरीद प्रक्रिया',
  },
  description: {
    en: 'Raw material procurement, vendor tracking, GRN inward, and quality pass.',
    hi: 'कच्चा माल खरीद, वेंडर ट्रैकिंग, जीआरएन आवक और बिल पासिंग।',
  },
  steps: [
    {
      step_no: 1,
      label: { en: 'Purchase Requisition', hi: 'खरीद मांग पत्र' },
      assignee: { type: 'DESIGNATION', designation_id: 'Production Executive' },
      is_important: true,
      tat: { kind: 'ANYTIME' },
      questions: [
        {
          key: 'item_name',
          label: { en: 'Material / Item Required', hi: 'आवश्यक माल / सामग्री' },
          type: 'text',
          required: true,
        },
        {
          key: 'required_qty',
          label: { en: 'Quantity Needed', hi: 'आवश्यक मात्रा' },
          type: 'number',
          required: true,
        },
        {
          key: 'vendor_name',
          label: { en: 'Preferred Vendor', hi: 'सप्लायर / वेंडर' },
          type: 'master_list',
          master_list_key: 'vendors',
          required: true,
        },
        {
          key: 'vendor_lead_days',
          label: { en: 'Vendor Promised Lead Time (Days)', hi: 'वेंडर द्वारा दिया गया समय (दिन)' },
          type: 'number',
          required: true,
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 2,
      label: { en: 'Issue PO & Advance', hi: 'पीओ जारी व पेमेंट' },
      assignee: { type: 'DESIGNATION', designation_id: 'Account' },
      is_important: true,
      tat: { kind: 'FIXED_HOURS', hours: 9 }, // 1 working day
      visible_data: ['item_name', 'required_qty', 'vendor_name'],
      questions: [
        {
          key: 'po_number',
          label: { en: 'PO Number', hi: 'पीओ नंबर' },
          type: 'text',
          required: true,
        },
        {
          key: 'payment_terms',
          label: { en: 'Payment Terms', hi: 'भुगतान की शर्तें' },
          type: 'select',
          options: ['100% Advance', 'Part Advance', '30 Days Credit', 'Against Delivery'],
          required: true,
        },
      ],
      on_complete: 'NEXT',
    },
    {
      step_no: 3,
      label: { en: 'Material Inward & GRN', hi: 'माल आवक व जीआरएन' },
      assignee: { type: 'DESIGNATION', designation_id: 'Warehouse Executive' },
      is_important: true,
      tat: {
        kind: 'DYNAMIC',
        from_step: 1,
        field_key: 'vendor_lead_days',
        unit: 'DAYS',
      },
      visible_data: ['item_name', 'required_qty', 'vendor_name', 'po_number'],
      questions: [
        {
          key: 'received_qty',
          label: { en: 'Actual Received Quantity', hi: 'प्राप्त मात्रा' },
          type: 'number',
          required: true,
        },
        {
          key: 'vendor_bill_no',
          label: { en: 'Vendor Bill / Challan No', hi: 'वेंडर बिल / चालान नंबर' },
          type: 'text',
          required: true,
        },
        {
          key: 'quality_status',
          label: { en: 'Physical Quality Check', hi: 'क्वालिटी जांच' },
          type: 'select',
          options: ['Passed - OK', 'Rejected - Return to Vendor', 'Partially Accepted'],
          required: true,
        },
      ],
      branches: [
        {
          when: { field: 'quality_status', equals: 'Rejected - Return to Vendor' },
          action: 'CLOSE',
        },
      ],
      on_complete: 'CLOSE',
    },
  ],
};
