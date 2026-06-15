# POS Module Help

## Overview
The POS Module is the restaurant billing and in-store ordering surface. It is designed for fast touchscreen order entry, table billing, KOT creation, and invoice printing.

## Total Screens: 3

### 1. POS Billing Screen (`/owner/pos`)
- Main feature: single-screen touchscreen order entry with live bill calculation.
- Includes: category chips, searchable menu, touch-friendly item cards, live order panel, GST recalculation, parcel charges, discounts, split/mixed payment support, and KOT preview.
- Benefit: keeps service staff productive while maintaining accurate billing and menu availability.

### 2. Table Billing Grid (`/pos/tables`)
- Main feature: visual table state management.
- Includes: table occupancy overview, active order handoff, waiter assignment, and table status updates.
- Benefit: supports dine-in operations and room-style order tracking.

### 3. Invoice Preview (`/pos/invoice`)
- Main feature: printable receipt and invoice preview.
- Includes: final bill summary, GST calculation, payment confirmation, and print-ready layout.
- Benefit: ensures clean customer-facing invoices and supports kitchen receipt/ESC-POS print options.

## Core Feature Highlights
- Touch-optimized item selection with fast search and category filters.
- Live bill totals with real-time tax, parcel, and discount updates.
- Mixed payment and split-bill support for cash + UPI or multi-guest bills.
- KOT creation and preview integrated into the billing flow.
- Stable fallback branch logic for owner POS when branch documents are unavailable.

## Key Feature Explanations
- Live Order Panel: shows current items, quantities, totals, and payment state without leaving the POS screen.
- Customer & Order Details: capture table assignment, customer phone lookup, delivery address, waiter notes, and kitchen instructions.
- Processing & Success: save orders, create KOT entries, and display success actions such as print bill or start a new order.
- Hold/Resume and Past Orders: retain active orders in the POS sidebar so staff can pause and continue work later.

---
*This file helps POS operators understand the module screens and the critical billing features built into the in-store workflow.*
