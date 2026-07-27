# Restaurant Billing And Printing System

Food Gedi now uses a shared thermal print engine for POS bills, GST invoices, KOT tickets, print previews, printer settings, and audit-ready print records.

## Receipt Workflow

The POS builds a `BillContext` from the active bill, branch, cashier, waiter, table, guests, payment method, line items, and tax settings. The same context renders in POS preview, A4 invoice, and printer test preview through `RestaurantBill`.

Receipts include restaurant logo placeholder, restaurant name, branch, address, phone, GSTIN, SAC, bill number, order number, date, time, cashier, waiter, table, guest count, order type, aligned item columns, indented modifiers, subtotal, discount, net amount, service charge, packing charge, CGST, SGST, IGST, grand total, payments, tendered amount, balance, QR placeholder, refund policy, and footer notes.

## KOT Workflow

`KotTicket` renders from `KotContext` and never includes prices, taxes, or totals. It includes KOT number, order number, timestamp, order type, table, waiter, priority, item quantities, modifiers, item notes, allergen warnings, and preparing/ready/served checkbox placeholders.

## POS Workflow

The POS screen separates order entry from table management. The left side provides menu search, category chips, and touch-friendly item add controls. The right side provides live receipt totals, GST recalculation, payment method, split/mixed payment controls, KOT preview toggle, print actions, and ESC/POS plan badges.

## Split Billing Workflow

The POS supports split modes by guest, item, and quantity. Guest split calculates per-person value. Mixed payment rows support cash and UPI now and are structured for card and additional methods. Payment balance is shown live against the bill total.

## ESC/POS Architecture

`buildEscPosPlan` prepares bridge-ready command steps:
- printer init
- center alignment
- bold title
- paper width
- encoding
- QR placeholder
- partial cut
- cash drawer pulse placeholder

The profile model supports browser fallback, USB, Bluetooth, Ethernet, and ESC/POS placeholders for Epson, Sunmi, Rongta, XPrinter, and generic printers.

## GST Invoice Workflow

Bill totals use the shared Indian GST helper. The printed invoice stores taxable amount, CGST, SGST, IGST, packing charge, service charge, grand total, GSTIN, and SAC `996331`. The structure is ready for accounting reports, GST reports, reconciliation, cashier closing, and sales journal entries.

## Print Template System

Templates support standard, compact, premium, and branded modes for 58mm, 80mm, and A4. Settings control logo, branch, QR, GST breakup, waiter name, item notes, footer, refund policy, and language-ready footer text.

## Firestore Print Structure

Firestore-ready collections:
- `receipts`
- `receiptTemplates`
- `kotTemplates`
- `printLogs`
- `printerProfiles`
- `paymentTransactions`
- `kotPrintQueue`

All documents are branch-aware and typed through Firebase converters. Print logs capture timestamp, cashier/user, branch, printer profile, source document id, duplicate/reprint state, and print status.

## Thermal Optimization Strategy

The print engine calculates fixed line widths by paper size: 58mm, 80mm, and A4. It centers headers, wraps long names, truncates unsafe overflow, right-aligns prices, indents modifiers, and uses monospaced separators so browser print output maps cleanly to thermal paper.
