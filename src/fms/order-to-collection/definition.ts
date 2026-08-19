/**
 * Order-to-Collection (O2C) FMS Definition
 * Code: O2C
 * Complete 18-step order management, staggered dispatch & payment collection workflow.
 */

import { FmsDefinition } from '../_framework/types';

export const orderToCollectionFms: FmsDefinition = {
  code: 'O2C',
  name: {
    en: 'Order-to-Collection (O2C)',
    hi: 'ऑर्डर से पेमेंट कलेक्शन (O2C)',
  },
  description: {
    en: 'End-to-end sales booking, production lead-time, staggered dispatch tracking, quality confirmation & payment collection.',
    hi: 'ऑर्डर बुकिंग से लेकर माल डिस्पैच, क्वालिटी कन्फर्मेशन और पेमेंट कलेक्शन तक का सम्पूर्ण सिस्टम।',
  },
  enable_bill_sequence_tracking: true,
  steps: [
    // ----------------------------------------------------
    // STEP 1: Order Receipt Information (Anyone)
    // ----------------------------------------------------
    {
      step_no: 1,
      label: {
        en: 'Order Receipt Information',
        hi: 'ऑर्डर प्राप्ति विवरण',
      },
      assignee: {
        type: 'DESIGNATION',
        designation_id: 'CRM',
      },
      is_important: false,
      tat: { kind: 'ANYTIME' },
      questions: [
        {
          key: 'customer_name',
          label: { en: 'Customer / Party Name', hi: 'पार्टी / ग्राहक का नाम' },
          type: 'master_list',
          master_list_key: 'customers',
          required: true,
          placeholder: { en: 'Select or add customer', hi: 'ग्राहक चुनें या नया जोड़ें' },
        },
        {
          key: 'order_received_through',
          label: { en: 'Order Received Through', hi: 'ऑर्डर कैसे प्राप्त हुआ' },
          type: 'select',
          options: ['In Person', 'Phone', 'WhatsApp'],
          required: true,
        },
        {
          key: 'entered_by_name',
          label: { en: 'Your Name (Order Receiver)', hi: 'आपका नाम (ऑर्डर लेने वाला)' },
          type: 'text',
          required: true,
          placeholder: { en: 'e.g. Lalita Yadav / KR / Himanshu', hi: 'उदा. ललिता यादव / केआर / हिमांशु' },
        },
      ],
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 2: Order Form Creation (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 2,
      label: {
        en: 'Order Form Creation',
        hi: 'ऑर्डर फॉर्म तैयार करना',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: true,
      tat: { kind: 'FIXED_HOURS', hours: 3 }, // 3 working hours
      visible_data: ['customer_name', 'order_received_through', 'entered_by_name'],
      questions: [
        {
          key: 'order_form_photo',
          label: { en: 'Filled Order Form Photo', hi: 'भरे हुए ऑर्डर फॉर्म का फोटो' },
          type: 'file',
          required: true,
        },
        {
          key: 'customer_name_corrected',
          label: { en: 'Customer Name (Confirm / Correct)', hi: 'ग्राहक का सही नाम' },
          type: 'text',
          required: true,
        },
        {
          key: 'customer_mobile',
          label: { en: 'Customer Mobile Number (10 Digits)', hi: 'ग्राहक का मोबाइल नंबर' },
          type: 'text',
          required: true,
          placeholder: { en: '98XXXXXXXX', hi: '98XXXXXXXX' },
        },
        {
          key: 'agent_name',
          label: { en: 'Agent Name', hi: 'एजेंट का नाम' },
          type: 'master_list',
          master_list_key: 'agents',
          required: true,
        },
        {
          key: 'transport_name',
          label: { en: 'Transport Name', hi: 'ट्रांसपोर्ट का नाम' },
          type: 'master_list',
          master_list_key: 'transports',
          required: true,
        },
        {
          key: 'discount_percent',
          label: { en: 'Discount %', hi: 'डिस्काउंट %' },
          type: 'number',
          required: false,
          placeholder: { en: 'e.g. 5', hi: 'उदा. 5' },
        },
        {
          key: 'customer_category',
          label: { en: 'Customer Category', hi: 'ग्राहक श्रेणी' },
          type: 'select',
          options: ['Category A (30 Days)', 'Category B (45 Days)', 'Category C (90 Days)'],
          required: true,
        },
        {
          key: 'quantity',
          label: { en: 'Total Quantity Ordered (Pcs)', hi: 'कुल ऑर्डर मात्रा (पीस)' },
          type: 'number',
          required: true,
          placeholder: { en: 'e.g. 1000', hi: 'उदा. 1000' },
        },
        {
          key: 'lead_time_days',
          label: { en: 'Committed Lead Time (Days)', hi: 'डिलीवरी का समय (दिन)' },
          type: 'number',
          required: true,
          placeholder: { en: 'e.g. 50', hi: 'उदा. 50' },
        },
        {
          key: 'payment_terms_days',
          label: { en: 'Payment Term (Days)', hi: 'भुगतान की अवधि (दिन)' },
          type: 'number',
          required: true,
          placeholder: { en: '30 / 45 / 90', hi: '30 / 45 / 90' },
        },
        {
          key: 'crm_executive',
          label: { en: 'Assigned CRM Executive', hi: 'नियुक्त CRM एग्जीक्यूटिव' },
          type: 'select',
          options: ['Lalita Yadav'],
          required: true,
        },
        {
          key: 'handed_to_deo',
          label: { en: 'Order Form Handed to DEO / MIS?', hi: 'क्या ऑर्डर फॉर्म DEO को दिया गया?' },
          type: 'select',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          key: 'special_notes',
          label: { en: 'Any Other Detail / Special Instructions', hi: 'अन्य विवरण / विशेष निर्देश' },
          type: 'text',
          required: false,
        },
      ],
      whatsapp_template: {
        template_key: 'orderConfirmation',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 3: VASTRA Software Entry (Harsh Malakar)
    // ----------------------------------------------------
    {
      step_no: 3,
      label: {
        en: 'VASTRA Software Entry',
        hi: 'वास्त्रा सॉफ्टवेयर में एंट्री',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9165072008',
        name: 'Harsh Malakar',
      },
      is_important: true,
      tat: { kind: 'FIXED_HOURS', hours: 3 }, // 3 working hours
      visible_data: [
        'customer_name_corrected',
        'customer_mobile',
        'quantity',
        'lead_time_days',
        'agent_name',
        'transport_name',
      ],
      questions: [
        {
          key: 'created_in_vastra',
          label: { en: 'Have you created the order in VASTRA?', hi: 'क्या वास्त्रा में ऑर्डर बना दिया?' },
          type: 'select',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          key: 'vastra_order_number',
          label: { en: 'VASTRA Order Number', hi: 'वास्त्रा ऑर्डर नंबर' },
          type: 'text',
          required: true,
          placeholder: { en: 'e.g. VAO-98214', hi: 'उदा. VAO-98214' },
        },
      ],
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 4: Dispatch Entry (Akash Soni / Sanjay Malakar - Repeatable)
    // ----------------------------------------------------
    {
      step_no: 4,
      label: {
        en: 'Dispatch Entry',
        hi: 'डिस्पैच एंट्री (बिल व चालान)',
      },
      assignee: {
        type: 'SHARED_USERS',
        users: [
          { phone: '7771002882', name: 'Akash Soni' },
          { phone: '7879883549', name: 'Sanjay Malakar' },
        ],
      },
      is_important: false,
      tat: { kind: 'DYNAMIC', from_step: 2, field_key: 'lead_time_days', unit: 'DAYS' },
      repeatable: {
        quantity_field: 'qty_dispatched',
        target_field: { from_step: 2, key: 'quantity' },
        auto_complete_at_percent: 80,
        requires_settlement: true,
      },
      visible_data: [
        'customer_name_corrected',
        'quantity',
        'lead_time_days',
        'agent_name',
        'transport_name',
        'vastra_order_number',
      ],
      questions: [
        {
          key: 'bill_no',
          label: { en: 'Bill / Invoice Number', hi: 'बिल / इनवॉयस नंबर' },
          type: 'text',
          required: true,
          placeholder: { en: 'e.g. BL-1045', hi: 'उदा. BL-1045' },
        },
        {
          key: 'bill_amount',
          label: { en: 'Bill Amount (₹)', hi: 'बिल राशि (₹)' },
          type: 'number',
          required: true,
          placeholder: { en: 'e.g. 50000', hi: 'उदा. 50000' },
        },
        {
          key: 'qty_dispatched',
          label: { en: 'Quantity Dispatched (Pcs)', hi: 'डिस्पैच मात्रा (पीस)' },
          type: 'number',
          required: true,
          placeholder: { en: 'e.g. 200', hi: 'उदा. 200' },
        },
        {
          key: 'product_category',
          label: { en: 'Product Category Dispatched', hi: 'डिस्पैच की गई उत्पाद श्रेणी' },
          type: 'select',
          options: [
            'Top / T-Shirt',
            'Half Bottom',
            'Full Bottom',
            'Capries',
            'Skirts',
            'Long Top / Alines',
            'Sets',
            'Boys',
            'Mix / Multi-product',
          ],
          required: true,
        },
        {
          key: 'cross_check_verified',
          label: { en: 'Customer & Rates Cross-checked?', hi: 'क्या ग्राहक व रेट्स का मिलान हो गया?' },
          type: 'select',
          options: ['Yes — Fully Verified', 'No'],
          required: true,
        },
        {
          key: 'entered_by_accountant',
          label: { en: 'Entered by (Accountant Name)', hi: 'एंट्री करने वाले का नाम' },
          type: 'select',
          options: ['Akash Soni', 'Sanjay Malakar'],
          required: true,
        },
      ],
      on_complete: { goto_step: 8 },
    },

    // ----------------------------------------------------
    // STEP 8: Order Completion Check (Manoj Bhaiya)
    // ----------------------------------------------------
    {
      step_no: 8,
      label: {
        en: 'Order Completion Check',
        hi: 'ऑर्डर पूर्णता जाँच',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '7771000411',
        name: 'Manoj Bhaiya',
      },
      is_important: true,
      tat: { kind: 'FIXED_HOURS', hours: 9 }, // 1 working day
      visible_data: [
        'customer_name_corrected',
        'quantity',
        'total_dispatched',
        'dispatch_percent',
        'lead_time_days',
      ],
      questions: [
        {
          key: 'is_order_completed',
          label: { en: 'Is this order completed & ready for closure?', hi: 'क्या ऑर्डर पूरा हो गया है और क्लोज किया जाए?' },
          type: 'select',
          options: ['Yes — Mark Completed', 'No — Order Still In Progress'],
          required: true,
        },
        {
          key: 'completion_notes',
          label: { en: 'Remarks / Shortage Details (if any)', hi: 'टिप्पणी / कमी का विवरण (यदि हो)' },
          type: 'text',
          required: false,
        },
      ],
      branches: [
        {
          when: { field: 'is_order_completed', equals: 'Yes — Mark Completed' },
          action: { goto_step: 9 },
        },
        {
          when: { field: 'is_order_completed', equals: 'No — Order Still In Progress' },
          action: { goto_step: 4 },
        },
      ],
      on_complete: { goto_step: 9 },
    },

    // ----------------------------------------------------
    // STEP 9: Order Completion Report (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 9,
      label: {
        en: 'Send Completion Report',
        hi: 'ऑर्डर पूर्णता रिपोर्ट भेजना',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: false,
      tat: { kind: 'FIXED_HOURS', hours: 1 },
      visible_data: ['customer_name_corrected', 'quantity', 'total_dispatched', 'lead_time_days'],
      questions: [
        {
          key: 'completion_report_sent',
          label: { en: 'Have you sent the Completion Report to Customer & Agent?', hi: 'क्या ग्राहक व एजेंट को रिपोर्ट भेज दी?' },
          type: 'select',
          options: ['Yes — Sent via WhatsApp', 'Skipped (Opt-out)'],
          required: true,
        },
      ],
      whatsapp_template: {
        template_key: 'completionReport',
        recipient_type: 'BOTH',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 10: Delivery & Quality Check Follow-up (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 10,
      label: {
        en: 'Delivery & Quality Check Call',
        hi: 'डिलीवरी व क्वालिटी फॉलो-अप कॉल',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: true,
      tat: { kind: 'FIXED_HOURS', hours: 63 }, // 7 working days (7 * 9h)
      visible_data: ['customer_name_corrected', 'customer_mobile', 'total_dispatched'],
      questions: [
        {
          key: 'goods_received',
          label: { en: 'Did the customer receive all goods?', hi: 'क्या ग्राहक को माल प्राप्त हो गया?' },
          type: 'select',
          options: ['Yes', 'No'],
          required: true,
        },
        {
          key: 'quality_satisfaction',
          label: { en: 'Is the customer satisfied with quality?', hi: 'क्या ग्राहक क्वालिटी से संतुष्ट है?' },
          type: 'select',
          options: ['Yes — Fully Satisfied', 'No — Problem Reported'],
          required: true,
        },
        {
          key: 'problem_description',
          label: { en: 'Issue Description (if quality/delivery problem reported)', hi: 'समस्या का विवरण (यदि कोई हो)' },
          type: 'text',
          required: false,
          placeholder: { en: 'Describe issue if any — auto-raises Help Slip', hi: 'समस्या का विवरण लिखें — स्वतः हेल्प स्लिप बनेगी' },
        },
      ],
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 11: Quality Approval Thank-You & Payment Notice (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 11,
      label: {
        en: 'Quality Thank-You + Payment Notice',
        hi: 'क्वालिटी धन्यवाद व पेमेंट नोटिस',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: false,
      tat: { kind: 'FIXED_HOURS', hours: 1 },
      visible_data: ['customer_name_corrected', 'customer_mobile', 'payment_due_date', 'total_bill_amount'],
      questions: [
        {
          key: 'notice_sent',
          label: { en: 'Have you sent Quality Thank-You & Payment Due Notice?', hi: 'क्या धन्यवाद व पेमेंट नोटिस भेज दिया?' },
          type: 'select',
          options: ['Yes — Sent via WhatsApp', 'Skipped (Opt-out)'],
          required: true,
        },
      ],
      whatsapp_template: {
        template_key: 'qualityThankYou',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 12: Pre-Due Reminder (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 12,
      label: {
        en: 'Pre-Due Payment Reminder',
        hi: 'तय तारीख से पहले पेमेंट स्मरण',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: false,
      tat: { kind: 'ANYTIME' }, // Triggered on date
      visible_data: ['customer_name_corrected', 'customer_mobile', 'payment_due_date', 'total_bill_amount'],
      questions: [
        {
          key: 'payment_received',
          label: { en: 'Has payment been received?', hi: 'क्या पेमेंट प्राप्त हो गया?' },
          type: 'select',
          options: ['No — Still Pending', 'Yes — Received in Full'],
          required: true,
        },
        {
          key: 'reminder_sent',
          label: { en: 'Was pre-due reminder sent to customer?', hi: 'क्या पेमेंट स्मरण संदेश भेजा गया?' },
          type: 'select',
          options: ['Yes', 'Skipped (Opt-out)'],
          required: true,
        },
      ],
      branches: [
        {
          when: { field: 'payment_received', equals: 'Yes — Received in Full' },
          action: { goto_step: 18 },
        },
      ],
      whatsapp_template: {
        template_key: 'preDueReminder',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 13: D-Day Message (Payment Due Today - Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 13,
      label: {
        en: 'Payment Due Today Message',
        hi: 'आज देय भुगतान संदेश (D-Day)',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: true,
      tat: { kind: 'ANYTIME' },
      visible_data: ['customer_name_corrected', 'customer_mobile', 'payment_due_date', 'total_bill_amount'],
      questions: [
        {
          key: 'payment_received',
          label: { en: 'Has payment been received today?', hi: 'क्या आज पेमेंट प्राप्त हो गया?' },
          type: 'select',
          options: ['No — Still Pending', 'Yes — Received in Full'],
          required: true,
        },
        {
          key: 'dday_message_sent',
          label: { en: 'Was D-Day reminder sent?', hi: 'क्या देय तिथि का संदेश भेजा गया?' },
          type: 'select',
          options: ['Yes', 'Skipped (Opt-out)'],
          required: true,
        },
      ],
      branches: [
        {
          when: { field: 'payment_received', equals: 'Yes — Received in Full' },
          action: { goto_step: 18 },
        },
      ],
      whatsapp_template: {
        template_key: 'dDayMessage',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 14: Follow-up 1 (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 14,
      label: {
        en: 'Payment Follow-up #1 (Overdue)',
        hi: 'पेमेंट फॉलो-अप #1',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: false,
      tat: { kind: 'FIXED_HOURS', hours: 99 }, // 11 working days (11 * 9h)
      visible_data: ['customer_name_corrected', 'customer_mobile', 'payment_due_date', 'total_bill_amount'],
      questions: [
        {
          key: 'payment_received',
          label: { en: 'Has payment been received?', hi: 'क्या पेमेंट प्राप्त हुआ?' },
          type: 'select',
          options: ['No — Still Pending', 'Yes — Received in Full'],
          required: true,
        },
        {
          key: 'on_account_payment',
          label: { en: 'Is there any on-account payment cleared?', hi: 'क्या कोई ऑन-अकाउंट पेमेंट एडजस्ट हुआ?' },
          type: 'select',
          options: ['No', 'Yes — Mapped and Cleared'],
          required: true,
        },
        {
          key: 'followup_status',
          label: { en: 'Customer Response / Call Note', hi: 'ग्राहक का उत्तर / बातचीत विवरण' },
          type: 'text',
          required: false,
          placeholder: { en: 'e.g. Promised payment on Friday', hi: 'उदा. शुक्रवार तक देने को कहा' },
        },
      ],
      branches: [
        {
          when: { field: 'payment_received', equals: 'Yes — Received in Full' },
          action: { goto_step: 18 },
        },
      ],
      whatsapp_template: {
        template_key: 'followUp1',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 15: Follow-up 2 (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 15,
      label: {
        en: 'Payment Follow-up #2 (Overdue)',
        hi: 'पेमेंट फॉलो-अप #2',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: false,
      tat: { kind: 'FIXED_HOURS', hours: 99 }, // 11 working days
      visible_data: ['customer_name_corrected', 'customer_mobile', 'payment_due_date', 'total_bill_amount'],
      questions: [
        {
          key: 'payment_received',
          label: { en: 'Has payment been received?', hi: 'क्या पेमेंट प्राप्त हुआ?' },
          type: 'select',
          options: ['No — Still Pending', 'Yes — Received in Full'],
          required: true,
        },
        {
          key: 'on_account_payment',
          label: { en: 'Is there any on-account payment cleared?', hi: 'क्या कोई ऑन-अकाउंट पेमेंट एडजस्ट हुआ?' },
          type: 'select',
          options: ['No', 'Yes — Mapped and Cleared'],
          required: true,
        },
        {
          key: 'followup_status',
          label: { en: 'Customer Response / Call Note', hi: 'ग्राहक का उत्तर / बातचीत विवरण' },
          type: 'text',
          required: false,
        },
      ],
      branches: [
        {
          when: { field: 'payment_received', equals: 'Yes — Received in Full' },
          action: { goto_step: 18 },
        },
      ],
      whatsapp_template: {
        template_key: 'followUp2',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 16: Follow-up 3 (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 16,
      label: {
        en: 'Payment Follow-up #3 (Final CRM Reminder)',
        hi: 'पेमेंट फॉलो-अप #3 (अंतिम स्मरण)',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: true,
      tat: { kind: 'FIXED_HOURS', hours: 99 }, // 11 working days
      visible_data: ['customer_name_corrected', 'customer_mobile', 'payment_due_date', 'total_bill_amount'],
      questions: [
        {
          key: 'payment_received',
          label: { en: 'Has payment been received?', hi: 'क्या पेमेंट प्राप्त हुआ?' },
          type: 'select',
          options: ['No — Escalate to PSDM', 'Yes — Received in Full'],
          required: true,
        },
        {
          key: 'on_account_payment',
          label: { en: 'Is there any on-account payment cleared?', hi: 'क्या कोई ऑन-अकाउंट पेमेंट एडजस्ट हुआ?' },
          type: 'select',
          options: ['No', 'Yes — Mapped and Cleared'],
          required: true,
        },
        {
          key: 'final_notes',
          label: { en: 'Summary for PSDM Escalation', hi: 'PSDM को भेजने हेतु सारांश' },
          type: 'text',
          required: false,
          placeholder: { en: 'Details of all 3 follow-ups and customer reaction', hi: 'तीनों फॉलो-अप्स का विवरण' },
        },
      ],
      branches: [
        {
          when: { field: 'payment_received', equals: 'Yes — Received in Full' },
          action: { goto_step: 18 },
        },
      ],
      whatsapp_template: {
        template_key: 'followUp3',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'NEXT', // If No -> goes to Step 17 (PSDM escalation)
    },

    // ----------------------------------------------------
    // STEP 17: Escalation to Problem Solver / PSDM (KR)
    // ----------------------------------------------------
    {
      step_no: 17,
      label: {
        en: 'PSDM Payment Recovery Escalation',
        hi: 'PSDM वसूली व समस्या निवारण',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9827055000',
        name: 'KR',
      },
      is_important: true,
      tat: { kind: 'ANYTIME' },
      visible_data: [
        'customer_name_corrected',
        'customer_mobile',
        'payment_due_date',
        'total_bill_amount',
        'final_notes',
      ],
      questions: [
        {
          key: 'psdm_resolution',
          label: { en: 'Resolution Action & Outcome', hi: 'निवारण कार्यवाही व परिणाम' },
          type: 'select',
          options: [
            'Payment Settled & Received',
            'Legal Notice Sent',
            'Agreed Settlement Plan',
            'Bad Debt / Written Off',
          ],
          required: true,
        },
        {
          key: 'payment_received',
          label: { en: 'Was payment received/cleared?', hi: 'क्या पेमेंट प्राप्त हो गया?' },
          type: 'select',
          options: ['Yes — Received in Full', 'No'],
          required: true,
        },
        {
          key: 'psdm_notes',
          label: { en: 'Resolution Notes', hi: 'निवारण टिप्पणी' },
          type: 'text',
          required: false,
        },
      ],
      branches: [
        {
          when: { field: 'payment_received', equals: 'Yes — Received in Full' },
          action: { goto_step: 18 },
        },
      ],
      on_complete: 'NEXT',
    },

    // ----------------------------------------------------
    // STEP 18: Full Payment Receipt & Closed (Lalita Yadav)
    // ----------------------------------------------------
    {
      step_no: 18,
      label: {
        en: 'Full Payment Receipt & Order Closure',
        hi: 'पेमेंट प्राप्ति धन्यवाद व ऑर्डर पूर्ण',
      },
      assignee: {
        type: 'DIRECT_USER_PHONE',
        phone: '9009200757',
        name: 'Lalita Yadav',
      },
      is_important: false,
      tat: { kind: 'FIXED_HOURS', hours: 1 },
      visible_data: ['customer_name_corrected', 'customer_mobile', 'total_dispatched', 'total_bill_amount'],
      questions: [
        {
          key: 'thank_you_sent',
          label: { en: 'Have you sent WhatsApp Thank-You & Repeat Order Request?', hi: 'क्या धन्यवाद व रिपीट ऑर्डर संदेश भेजा?' },
          type: 'select',
          options: ['Yes — Sent via WhatsApp', 'Skipped (Opt-out)'],
          required: true,
        },
      ],
      whatsapp_template: {
        template_key: 'paymentReceipt',
        recipient_type: 'CUSTOMER',
      },
      on_complete: 'CLOSE',
    },
  ],
};
