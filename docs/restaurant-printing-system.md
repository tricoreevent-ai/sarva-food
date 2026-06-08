# Restaurant Printing System

Nammude now uses a shared print engine for POS bills, printable invoices, KOT previews, printer settings, ESC/POS command planning, and audit-ready print records.

## Bill Workflow

The POS builds a `BillContext` from the active bill, branch, cashier, waiter, table, payment method, and tax settings. `RestaurantBill` renders the same professional bill in POS preview, A4 invoice, and printer settings test preview.

Bills include restaurant branding, branch address, phone, GSTIN, invoice number, date/time, cashier, waiter, table, guests, item rows, modifiers, subtotal, discount, service charge, packing charge, CGST, SGST, IGST, tendered amount, balance, footer notes, and QR placeholder.

## KOT Workflow

`KotTicket` renders kitchen order tickets without prices, taxes, or totals. KOTs include ticket number, order number, order type, table number, waiter, timestamp, priority, item quantities, modifiers, allergen alerts, notes, and preparing/ready/served checkbox placeholders.

The POS can switch from bill preview to KOT preview. The printer module shows KOT and customer bill side by side for test printing.

## POS Workflow

The POS screen keeps the existing store and route. It now has a left operational panel for category chips, search, and touch-friendly item cards. The right panel shows live bill totals with GST recalculation, payment method, table selection, pay/print actions, KOT preview, and ESC/POS plan badges.

## ESC/POS Architecture

`buildEscPosPlan` produces a command plan for browser or native bridge integrations:
- initialize printer
- center align
- bold text
- set paper width
- set encoding
- print QR placeholder
- cut paper
- cash drawer pulse placeholder

The architecture is ready for Epson, Rongta, Sunmi, XPrinter, and generic ESC/POS devices.

## Template System

Templates support:
- 58mm thermal
- 80mm thermal
- A4 invoice
- compact or premium mode
- logo visibility
- GST breakup visibility
- QR visibility
- footer visibility
- waiter visibility
- item notes visibility

Templates are branch-aware and stored locally in the current app store, with Firestore document types and services prepared for `billTemplates` and `kotTemplates`.

## Printer Routing

Printer profiles support billing, kitchen, and bar routing per branch. Profiles include connection type, paper width, copies, auto-cut, encoding, margins, font scaling, and health status. Browser print remains the fallback while USB, Bluetooth, Ethernet, and ESC/POS bridges are represented as first-class settings.

## GST Invoice Workflow

Bill totals use the shared Indian GST helper from the menu engine. Every bill can store subtotal, discount, taxable amount, service charge, packing charge, CGST, SGST, IGST, total GST, grand total, payment method, cashier, branch, printer profile, and invoice number.

## Print Audit Structure

Firestore-ready collections:
- `billTemplates`
- `kotTemplates`
- `printerProfiles`
- `printLogs`
- `receipts`
- `kotPrintQueue`

Print logs track timestamp, user, branch, printer used, reference ID, print type, status, duplicate flag, failed prints, and reprints. Receipts are ready to feed accounting reports, GST reports, sales journal, reconciliation, cashier closing, and audit logs.
