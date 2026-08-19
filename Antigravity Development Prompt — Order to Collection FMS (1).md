# ORDER TO COLLECTION FMS
## Complete Workflow & CRM Automation Requirement

### 1. PROJECT OBJECTIVE

Build a complete **Order to Collection FMS (Field Management System)** inside the internal CRM/application.

The primary objective is:

> **Customer ka order receive hone se lekar complete dispatch, delivery confirmation, quality feedback, payment collection aur final payment receipt tak poora process systematically track aur automate karna.**

The system should provide an **Amazon-level customer service experience**, including:

- Order tracking
- Order number tracking
- Dispatch status
- Dispatch percentage
- LR details
- Transport receipt details
- Delivery status
- Quality follow-up
- Payment due date
- Payment reminders
- Payment status
- Escalation of delayed payments
- Final payment confirmation
- New requirement / repeat-order opportunity

The entire process should be connected through a unique **Order Number**.

---

# 2. ORDER NUMBER FORMAT

Every new order must automatically receive a unique Order Number.

### Format:

`Group-FY-Number`

### Example:

`ORD-2627-0001`

The Order Number should be generated automatically when the Order Form is created.

This Order Number will act as the **primary identifier/key** for the complete Order to Collection workflow.

It should be used for:

- Order tracking
- VASTRA mapping
- Dispatch entries
- Customer communication
- Dispatch percentage calculation
- Completion tracking
- Payment tracking
- Collection tracking
- Reporting

---

# 3. FIXED EMPLOYEE / ROLE MAPPING

These roles and employee names must be used in the system.

## CRM Executive / Sales Coordinator

**Name:** Lalita Yadav

Lalita Yadav will handle:

- Order Form Creation
- Customer information correction/update
- CRM Executive assignment
- Customer communication
- Dispatch milestone communication
- Order completion communication
- Quality follow-up
- Payment reminders
- Payment follow-ups
- Final payment receipt communication

Wherever the original process mentions **Sales Coordinator** or **CRM Executive**, the responsible employee for this workflow is:

> **Lalita Yadav**

---

## DEO / MIS Executive

**Name:** Harsh Malakar

Harsh Malakar will handle:

- VASTRA order entry
- VASTRA order number entry
- Confirmation that the order has been created in VASTRA

Role:

> **Data Entry Operator / MIS Executive**

---

## Accounts Executives

The Accounts Executive role will be handled by:

1. **Akash Soni**
2. **Sanjay Malakar**

They will handle:

- Bill creation
- Dispatch entry
- Order number mapping
- Bill detail cross-check
- Dispatch quantity entry
- Product category entry
- Dispatch-related records

Either Akash Soni or Sanjay Malakar should be selectable as the Accounts Executive responsible for a dispatch entry.

---

# 4. GLOBAL BUSINESS RULES

## Rule 1 — WhatsApp Opt-Out Check

Every WhatsApp communication must first check the customer's WhatsApp communication preference.

Applicable to all WhatsApp steps, including:

- Step 2
- Step 5
- Step 6
- Step 7
- Step 9
- Step 11
- Step 12
- Step 13
- Step 14
- Step 15
- Step 16
- Step 18

### Logic:

```text
Before WhatsApp Send
        ↓
Check Customer Opt-Out Status
        ↓
   ┌────┴────┐
   ↓         ↓
OPTED OUT   NOT OPTED OUT
   ↓         ↓
SKIP       SEND MESSAGE
```

If the customer has opted out:

> Do NOT send the WhatsApp message.

The workflow itself should continue normally.

---

# 5. DISPATCH MILESTONE RULE

Steps 5, 6 and 7 depend on the total order quantity.

### If Order Quantity < 400 pieces

Skip:

- Step 5 — 25%
- Step 6 — 50%
- Step 7 — 70%

The order should proceed without these milestone communications.

### If Order Quantity = 400–900 pieces

Skip:

- Step 5 — 25%

Apply:

- Step 6 — 50%
- Step 7 — 70%

### If Order Quantity > 900 pieces

Apply all:

- Step 5 — 25%
- Step 6 — 50%
- Step 7 — 70%

Important:

These are **quantity-based triggers**, not time-based triggers.

---

# 6. PAYMENT MID-CHAIN RULE

Steps 12–16 are payment-chasing touchpoints.

If payment is received at ANY point during these steps:

- Stop all remaining payment reminders.
- Do not trigger the next follow-up.
- Immediately move the order to Step 18 — Full Payment Receipt.

Example:

```text
Step 12
Payment Received
      ↓
Skip 13, 14, 15, 16
      ↓
Step 18
```

Same logic applies if payment is received during:

- Step 13
- Step 14
- Step 15
- Step 16

---

# 7. STEP-BY-STEP WORKFLOW

---

## STEP 1 — ORDER RECEIPT INFORMATION

### Purpose

The company must first record that a new order has been received.

Orders can be received through:

- In Person
- Phone
- WhatsApp

Anyone in the company can record this initial information.

### Responsible Person

**Anyone**

### System

Internal Application

### Timing

Anytime / Open

### Required Fields

1. Party Name / Customer Name
2. Order Received Through:
   - In Person
   - Phone
   - WhatsApp
3. Name of person entering the information

### Output

A new order receipt record is created.

Then the workflow moves to:

> **Step 2 — Order Form Creation**

---

# STEP 2 — ORDER FORM CREATION

### Responsible Person

**Lalita Yadav**

Role:

> CRM Executive / Sales Coordinator

### Timing

Within **3 working hours** of Step 1 completion.

### Purpose

Lalita Yadav will convert the basic order receipt information into a proper customer/order record.

She will create the standard hard-copy Order Form.

### Responsibilities

Lalita Yadav must:

1. Fill the standard order form.
2. Check the customer name.
3. Correct/update customer name if required.
4. Enter customer's mobile number.
5. Save customer information permanently.
6. Enter Agent Name.
7. Enter Transport Name.
8. Enter Discount Percentage.
9. Select Customer Category.
10. Enter Total Quantity Ordered.
11. Enter Lead Time.
12. Enter Payment Terms.
13. Assign CRM Executive.
14. Upload photo of completed Order Form.
15. Confirm that the Order Form was handed over to the DEO.
16. Enter any other relevant detail.

### Required Fields

- Photo of filled Order Form
- Order Form handed to DEO? Yes/No
- Agent Name
- Transport Name
- Discount %
- Customer Category
- Total Quantity Ordered
- Lead Time
- Payment Terms
- CRM Executive Assigned
- Other Details

### Order Number

When the order form is saved:

> System automatically generates a unique Order Number.

Example:

`ORD-2627-0001`

### WhatsApp

A WhatsApp button should be available.

Clicking the button should:

1. Check customer WhatsApp opt-out status.
2. If not opted out:
   - Open customer's WhatsApp chat.
   - Pre-fill the order details message.
   - Message should contain order details.
   - Do NOT include the Order Form photo.
3. If opted out:
   - Skip WhatsApp communication.

### Output

Completed Order Form + permanent customer details + unique Order Number.

Then move to:

> **Step 3 — Software Entry in VASTRA**

---

# STEP 3 — SOFTWARE ENTRY IN VASTRA

### Responsible Person

**Harsh Malakar**

Role:

> Data Entry Operator / MIS Executive

### Timing

Within **3 working hours** of Step 2 completion.

### Purpose

The order created in the internal FMS must now be entered into VASTRA.

### Harsh Malakar must:

1. Open VASTRA.
2. Create the order.
3. Enter the required order information.
4. Obtain the VASTRA Order Number.
5. Submit the FMS task.

### FMS Questions

**Question 1:**

Have you created the order form in VASTRA?

Expected answer:

`Yes`

**Question 2:**

Please enter the VASTRA Order Number.

### Submission Rule

The task can only be submitted when:

```text
VASTRA Order Created = YES
AND
VASTRA Order Number is entered
```

If both conditions are satisfied:

> Step 3 Complete

Then move to:

> **Step 4 — Dispatch Entry**

---

# STEP 4 — DISPATCH ENTRY

### Responsible Persons

- Akash Soni
- Sanjay Malakar

Role:

> Accounts Executive

### Timing

Anytime a dispatch happens.

### IMPORTANT

This is a **REPEATABLE / OPEN-ENDED STEP**.

It does NOT complete after the first dispatch.

One order can have multiple dispatches.

### Example

Order:

`ORD-2627-0001`

Total Order:

`1,000 pieces`

Possible dispatches:

```text
Dispatch 1 → 200 pcs
Dispatch 2 → 250 pcs
Dispatch 3 → 300 pcs
Dispatch 4 → 250 pcs
```

Therefore:

> 1 Order = 1 Order Record

but:

> 1 Order = Multiple Dispatch Records

### Dispatch Form

When Accounts Executive enters the Order Number, the system must automatically pull:

- Customer Name
- Agent Name
- Discount
- Transport
- Order Quantity
- Lead Time
- Payment Terms
- Other Step 2 information

This information should be shown for cross-checking.

### Required Fields

1. Bill Number
2. Order Number
3. Customer details — auto-pulled
4. Agent — auto-pulled
5. Discount — auto-pulled
6. Transport — auto-pulled
7. Bill details cross-check confirmation
8. Quantity dispatched in this bill
9. Product category dispatched
10. Accounts Executive name

### Cross-Check

Question:

> Did you cross-check all the details of the bill?

Options:

- Yes
- No

### Output

Every dispatch creates a separate Dispatch Record.

These records should feed the Dispatch Tracking FMS.

---

# 8. DISPATCH PERCENTAGE CALCULATION

The system must continuously calculate:

```text
Actual Dispatch %
=
Total Quantity Dispatched
÷
Total Order Quantity
×
100
```

Example:

Order = 1,000 pcs

Dispatched = 630 pcs

Actual Dispatch % = 63%

IMPORTANT:

The Agent Dashboard must show the **actual percentage**, not 25/50/70 rounded values.

---

# STEP 5 — 25% DISPATCH UPDATE

### Responsible Person

**Lalita Yadav**

### Trigger

Automatically trigger when:

> Actual dispatched quantity reaches 25% of total order quantity.

### Applicability

Only applicable when:

> Order Quantity > 900 pieces

For orders below 400 and orders between 400–900, this step is skipped according to the milestone rules.

### Action

Lalita Yadav's task is generated.

System checks WhatsApp opt-out.

If allowed:

Send WhatsApp to:

1. Customer
2. Agent

Message:

> 25% of the order has been dispatched.

### LR

If customer asks for LR:

> Lalita Yadav arranges and sends the LR.

### This step has no questions.

---

# STEP 6 — 50% DISPATCH UPDATE

### Responsible Person

**Lalita Yadav**

### Trigger

Actual dispatch reaches:

> 50% of total order quantity.

### Applicability

Applicable for:

- 400–900 pieces
- >900 pieces

Skipped for:

- <400 pieces

### Action

After opt-out check:

Send WhatsApp update to:

- Customer
- Agent

Message:

> 50% of the order has been dispatched.

If customer asks for LR:

> Arrange and send LR.

---

# STEP 7 — 70% DISPATCH UPDATE

### Responsible Person

**Lalita Yadav**

### Trigger

Actual dispatch reaches:

> 70% of total order quantity.

### Applicability

Applicable for:

- 400–900 pieces
- >900 pieces

Skipped for:

- <400 pieces

### Action

After opt-out check:

Send WhatsApp update to:

- Customer
- Agent

Message:

> 70% of the order has been dispatched.

If customer asks for LR:

> Arrange and send LR.

---

# STEP 8 — ORDER COMPLETION CHECK

### Responsible Person

**Dispatch Planner**

### Trigger

Based on the Lead Time entered during Step 2.

Example:

If Lead Time = 50 days:

The order should appear in the Dispatch Planner's task list around the week when Day 50 is approaching.

### Responsibility

Dispatch Planner reviews the order and decides:

> Is the order fully completed and ready for settlement?

### System

Internal App

### Important

This is a decision/checkpoint step.

Once the Dispatch Planner marks:

> ORDER COMPLETED

move immediately to:

> **Step 9**

---

# STEP 9 — ORDER COMPLETION REPORT

### Responsible Person

**Lalita Yadav**

### Trigger

Immediately after Step 8 marks the order completed.

### Recipients

1. Customer
2. Agent

### Report must contain

- Order Number
- Quantity Ordered
- Quantity Delivered
- Promised Delivery Time
- Actual Delivery Time

Also include a warm gratitude message.

### WhatsApp

First check opt-out status.

If not opted out:

Send the completion report through WhatsApp.

If opted out:

Skip WhatsApp.

---

# STEP 10 — DELIVERY & QUALITY CHECK FOLLOW-UP

### Responsible Person

**Lalita Yadav**

### Trigger

**7 working days after order completion / last delivery.**

Working hours:

**10 AM – 7 PM**

### Method

Phone Call

### Purpose

Confirm:

1. Did customer receive the goods?
2. Is the quality okay?
3. Is there any problem?

### If Problem = YES

System should allow:

> Help Ticket Creation

The issue should be recorded and tracked.

### If Everything is OK

Move to:

> Step 11 — Quality Approval Thank-You & Payment Notice

---

# STEP 11 — QUALITY APPROVAL + PAYMENT NOTICE

### Responsible Person

**Lalita Yadav**

### Trigger

Immediately after Step 10 confirms:

- Goods received
- Quality approved
- No issue

### Action

Send customer a thank-you message.

The message must also contain:

> Payment Due Date

The due date should be automatically calculated using the Payment Terms entered in Step 2.

### WhatsApp

Check opt-out first.

If allowed:

Send WhatsApp.

---

# STEP 12 — PRE-DUE-DATE PAYMENT REMINDER

### Responsible Person

**Lalita Yadav**

### Trigger

20% of the payment-term period before the payment due date.

### Example

Payment Terms:

35 days

20% ≈ 7 days

Therefore:

> Reminder around Day 28.

### FIRST ACTION

Check:

> Has payment already been received?

### If YES

```text
Skip Step 12
      ↓
Go directly to Step 18
```

### If NO

Lalita Yadav:

1. Calls customer.
2. Then sends WhatsApp reminder.

Message should communicate:

> Payment is due soon.

The customer should be thanked for the order.

---

# STEP 13 — D-DAY PAYMENT MESSAGE

### Responsible Person

**Lalita Yadav**

### Trigger

Payment Due Date.

### FIRST ACTION

Check payment status.

### If Payment Received

```text
Step 13
   ↓
Payment Received
   ↓
Step 18
```

### If Payment NOT Received

Lalita Yadav:

1. Calls customer.
2. Sends WhatsApp message.

Message:

> Payment is due today.

---

# STEP 14 — PAYMENT FOLLOW-UP 1

### Responsible Person

**Lalita Yadav**

### Trigger

Approximately:

> 10–12 days after D-Day.

### First Action

Check payment status.

Also check:

> On-account payment received?

If yes:

> Is it correctly mapped and cleared?

### If Payment Received

Go directly to:

> Step 18

Do NOT trigger Step 15 or Step 16.

### If Payment Not Received

Lalita Yadav:

1. Calls customer.
2. Sends WhatsApp follow-up.

---

# STEP 15 — PAYMENT FOLLOW-UP 2

### Responsible Person

**Lalita Yadav**

### Trigger

Approximately:

> 10–12 days after Follow-up 1.

### First Action

Check:

- Payment received?
- On-account payment?
- Is payment mapped?
- Is payment cleared?

### If Payment Received

Go directly to:

> Step 18

### If Payment Not Received

Lalita Yadav:

1. Calls customer.
2. Sends WhatsApp Follow-up 2.

---

# STEP 16 — PAYMENT FOLLOW-UP 3

### Responsible Person

**Lalita Yadav**

### Trigger

Approximately:

> 10–12 days after Follow-up 2.

This is the **final CRM payment follow-up**.

### First Action

Check:

- Payment received?
- On-account payment?
- Payment mapped?
- Payment cleared?

### If Payment Received

Go directly to:

> Step 18

### If Payment Not Received

Lalita Yadav:

1. Calls customer.
2. Sends WhatsApp Follow-up 3.

After this:

> Escalate to Step 17.

---

# STEP 17 — ESCALATION TO PROBLEM SOLVER (PSDM)

### Trigger

Payment is still not received after:

- Pre-Due Reminder
- D-Day
- Follow-up 1
- Follow-up 2
- Follow-up 3

### Responsible Person

**Problem Solver (PSDM)**

### Process

Create an escalation through:

> Delegation Sheet

The case should appear on the Problem Solver's dashboard.

### Important

The case remains OPEN until:

> Payment issue is resolved and payment is received.

Do not automatically close the case.

Once payment is received:

> Move to Step 18.

---

# STEP 18 — FULL PAYMENT RECEIPT

### Responsible Person

**Lalita Yadav**

### Trigger

Payment can be received at any point:

```text
Step 12
Step 13
Step 14
Step 15
Step 16
Step 17
```

As soon as payment is confirmed:

> Immediately trigger Step 18.

### IMPORTANT

If payment is received during any payment-chasing step:

> All remaining payment-chasing steps must be cancelled/skipped.

### Action

After opt-out check:

Send WhatsApp thank-you message.

The message should:

1. Confirm payment received.
2. Thank the customer.
3. Ask:

> Do you have any new requirement?

### Purpose

The objective is not only payment collection.

It should also help generate:

> Repeat Order / New Requirement.

---

# 9. AGENT SCORING / DISPATCH DASHBOARD

This is NOT a workflow step.

It is a permanent dashboard/reporting feature.

### Responsible

System — Auto Generated

### Visible To

Agents

### Dashboard should show

For each Agent:

- Customer Name
- Order Number
- Order Date
- Quantity Ordered
- Quantity Dispatched
- Actual Dispatch %
- Current Order Status
- Lead Time
- Completion Status
- Payment Status

### Important

The dashboard must show the:

> ACTUAL DISPATCH %

Example:

Order = 1,000 pcs

Dispatched = 630 pcs

Dashboard:

> **63% Dispatched**

Do NOT show only:

25% / 50% / 70%.

Those percentages are only CRM communication triggers.

### Delivery

The report should:

- Be generated daily.
- Be sent to each Agent.
- Also remain visible live inside the App.

---

# 10. COMPLETE SYSTEM FLOW

The final application workflow should follow this structure:

```text
CUSTOMER ORDER RECEIVED
        ↓
STEP 1
Order Receipt Information
        ↓
STEP 2
Order Form Creation
Lalita Yadav
        ↓
Unique Order Number Generated
        ↓
STEP 3
VASTRA Entry
Harsh Malakar
        ↓
STEP 4
Dispatch Entry
Akash Soni / Sanjay Malakar
        ↓
Multiple Dispatches
        ↓
Actual Dispatch % Continuously Calculated
        ↓
 ┌─────────────────────────────┐
 │ Dispatch Milestone Trigger  │
 └─────────────────────────────┘
        ↓
 ┌─────────┬─────────┬─────────┐
 │  25%    │  50%    │  70%    │
 │ Step 5  │ Step 6  │ Step 7  │
 └─────────┴─────────┴─────────┘
        ↓
STEP 8
Order Completion Check
Dispatch Planner
        ↓
ORDER COMPLETED
        ↓
STEP 9
Completion Report
Lalita Yadav
        ↓
7 Working Days
        ↓
STEP 10
Delivery & Quality Call
        ↓
 ┌─────────────────────┐
 │ Quality OK?         │
 └─────────┬───────────┘
       NO  │       YES
       ↓             ↓
 Help Ticket      STEP 11
                  Quality Approval
                  + Payment Due Date
                       ↓
                  STEP 12
                  Pre-Due Reminder
                       ↓
                  STEP 13
                  D-Day
                       ↓
                  STEP 14
                  Follow-up 1
                       ↓
                  STEP 15
                  Follow-up 2
                       ↓
                  STEP 16
                  Follow-up 3
                       ↓
                  STEP 17
                  PSDM Escalation
                       ↓
                  PAYMENT RECEIVED
                       ↓
                  STEP 18
                  Full Payment Receipt
                       ↓
                  New Requirement?
                       ↓
                      END
```

---

# 11. PAYMENT DECISION LOGIC

This logic is extremely important and must be implemented exactly.

```text
                PAYMENT CHECK
                     ↓
             Payment Received?
                /          \
              YES           NO
               ↓             ↓
          STEP 18       Continue Current
                        Payment Step
                             ↓
                       Next Follow-up
```

At Steps 12–16:

```text
Payment Received
       ↓
Cancel All Remaining
Payment Touchpoints
       ↓
Step 18
```

---

# 12. DISPATCH DECISION LOGIC

```text
             TOTAL ORDER QTY
                    ↓
        ┌───────────┼───────────┐
        ↓           ↓           ↓
      <400       400–900       >900
        ↓           ↓           ↓
   Skip 25/50/70  Skip 25%   Apply 25/50/70
        ↓           ↓           ↓
   Completion     50% + 70%    25% + 50% + 70%
```

---

# 13. REPEATABLE DISPATCH STRUCTURE

The system must maintain two related data structures:

### ORDER FMS

One Order = One main Order Record.

Example:

```text
ORD-2627-0001
Customer: ABC
Order Qty: 1,000
```

### DISPATCH FMS

One Order = Multiple Dispatch Records.

Example:

```text
ORD-2627-0001
    │
    ├── Dispatch 1 → 200 pcs
    ├── Dispatch 2 → 250 pcs
    ├── Dispatch 3 → 300 pcs
    └── Dispatch 4 → 250 pcs
```

The Dispatch FMS must always be linked to the main Order through:

> **Order Number**

---

# 14. SYSTEM AUTOMATION REQUIREMENTS

The application should automatically handle:

### Automatic

- Unique Order Number generation
- Customer information persistence
- VASTRA order tracking
- Dispatch percentage calculation
- 25% trigger
- 50% trigger
- 70% trigger
- Lead-time based completion task
- 7-working-day quality follow-up
- Payment due-date calculation
- Pre-due reminder trigger
- D-Day reminder trigger
- Follow-up scheduling
- Payment status checks
- Payment-chain cancellation after payment
- PSDM escalation
- Step 18 trigger
- Daily Agent Dashboard

### Manual Actions

- Order receipt
- Order Form completion
- VASTRA entry
- Bill creation
- Dispatch entry
- LR arrangement when requested
- Customer phone calls
- Quality issue/help-ticket creation
- PSDM resolution

---

# 15. CUSTOMER COMMUNICATION PRINCIPLE

The communication flow should feel like a professional CRM rather than a collection of random WhatsApp messages.

Customer should receive relevant communication at important milestones:

```text
ORDER RECEIVED
      ↓
ORDER CONFIRMATION
      ↓
25% DISPATCH
      ↓
50% DISPATCH
      ↓
70% DISPATCH
      ↓
ORDER COMPLETED
      ↓
QUALITY CHECK
      ↓
QUALITY APPROVED
      ↓
PAYMENT DUE REMINDER
      ↓
D-DAY REMINDER
      ↓
PAYMENT FOLLOW-UPS
      ↓
PAYMENT RECEIVED
      ↓
THANK YOU + NEW REQUIREMENT
```

Every WhatsApp communication must respect the customer's opt-out preference.

---

# 16. FINAL SUCCESS CONDITION

An Order should be considered completely closed only when:

```text
Order Completed
      +
Quality Confirmed
      +
Payment Received
      +
Final Payment Communication Sent
      +
New Requirement Asked
```

The final objective of the system is:

> **Order → Excellent Service → Complete Dispatch → Quality Satisfaction → Timely Payment → Customer Retention → New Order**

---

# 17. IMPORTANT IMPLEMENTATION INSTRUCTION FOR ANTIGRAVITY

Build this workflow as a **real functional CRM/FMS workflow**, not merely as a static flowchart.

The application should have:

- Role-based task assignment
- Employee-based responsibility
- Order master record
- Dispatch child records
- Customer master
- Payment tracking
- Automated triggers
- Task queues
- WhatsApp communication actions
- Opt-out management
- Status tracking
- Escalation tracking
- Dashboard/reporting
- Audit trail/history
- Automatic date/time calculations

The system must preserve the relationship:

**Customer → Order → VASTRA Order → Dispatches → Completion → Quality → Payment → Collection → Final Closure**

Do not break this relationship at any stage.

The three fixed operational employees for this workflow are:

**CRM Executive / Sales Coordinator: Lalita Yadav**

**DEO / MIS Executive: Harsh Malakar**

**Accounts Executives: Akash Soni and Sanjay Malakar**

Use these names in the task assignment and workflow wherever applicable.