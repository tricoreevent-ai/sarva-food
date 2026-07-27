# Food Gedi Production Smoke Test

| Area | Objective | Steps | Expected Result | Pass | Fail | Remarks |
| --- | --- | --- | --- | --- | --- | --- |
| Customer | Verify discovery and ordering entry points. | Open home, restaurants, restaurant page, menu, item detail. | Data loads with loading, empty, and error states handled. |  |  |  |
| Restaurant | Verify public restaurant freshness. | Compare hosted restaurant/menu/offers with admin data. | No stale cache or demo/test-owner data appears. |  |  |  |
| QR Ordering | Verify table session lifecycle. | Scan QR, start session, verify phone/OTP, place order, request waiter. | Session is bound, order/request reaches operations. |  |  |  |
| Owner | Verify owner shell and protected workflows. | Login, use dashboard, search, notification center, view switch. | Owner scope and navigation work without console errors. |  |  |  |
| POS | Verify cashier order flow. | Add/remove items, set type/table/customer, hold/resume, send kitchen, collect payment. | Draft, kitchen ticket, payment, and active orders stay synced. |  |  |  |
| Kitchen | Verify KDS flow. | Receive order, change status, bulk action, filter, sound, print KOT. | Statuses update with rollback on failure. |  |  |  |
| Waiter | Verify waiter/table actions. | Open waiter view, handle table order/request, send items to kitchen. | Waiter actions update canonical operational read model. |  |  |  |
| Cashier | Verify payment and receipt handling. | Collect full and partial payment, print bill/receipt. | Payment history and print logs are created. |  |  |  |
| Manager | Verify manager metrics/actions. | Check active orders, delayed orders, revenue, staff view. | Metrics reflect live order state. |  |  |  |
| Admin | Verify platform operations. | Login, CMS, restaurants, users, roles, diagnostics, Menu Library. | Admin workflows load and save with scoped permissions. |  |  |  |
| Printing | Verify physical print outputs. | Print bill, receipt, split receipt, KOT, duplicate, reprint. | Output matches selected profile and logs print history. |  |  |  |
| Bill | Verify bill preview/download/print. | Open bill preview, print, download. | No raw errors; paper size is correct. |  |  |  |
| Receipt | Verify receipt generation. | Complete payment and print receipt. | Receipt reflects paid amount and payment method. |  |  |  |
| KOT | Verify kitchen ticket output. | Send POS/QR order to kitchen and print KOT. | KOT has items, modifiers, table/type, priority. |  |  |  |
| Reprint | Verify print history reprint. | Open print history and reprint bill/KOT/receipt. | Reprint uses stored data and logs attempt. |  |  |  |
| Notification Center | Verify filters and read state. | Open topbar alerts, filter, mark read/all, open related route. | Read state is explicit; stale paid orders are hidden. |  |  |  |
| Timeline | Verify order event history. | Open order timeline after kitchen/payment actions. | Events appear once and in sensible order. |  |  |  |
| Payment History | Verify payment audit. | Split/partial/full payments and print receipt. | Payment rows, split rows, and print rows are visible. |  |  |  |
| Split Bill | Verify split payment consistency. | Split an active bill across methods/amounts. | Split rows, transactions, receipt queue, audit, notifications write. |  |  |  |
| Merge Table | Verify merge consistency. | Merge two active orders into a target. | Target keeps lines, totals, payment/split history, source audit continuity. |  |  |  |
| Transfer Table | Verify table transfer. | Transfer active order to another table/waiter. | Order, customer order, and kitchen ticket update consistently. |  |  |  |
| Realtime | Verify multi-device sync. | Use cashier, waiter, kitchen, manager sessions together. | State updates without duplicate listeners or stale subscriptions. |  |  |  |
| Responsive | Verify layouts. | Test mobile, tablet, desktop, Kitchen TV. | No overflow, overlap, or unusable controls. |  |  |  |
| Accessibility | Verify keyboard and ARIA. | Navigate dialogs, buttons, filters, notification panel by keyboard. | Focus trap, labels, Escape close, and focus return work. |  |  |  |
| Offline Recovery | Verify owner/POS recovery. | Simulate offline, queue safe action, return online. | Queue retries or surfaces failure safely. |  |  |  |
| Network Recovery | Verify API failure states. | Interrupt requests and retry. | Loading, error, retry, rollback states work. |  |  |  |
| Browser Compatibility | Verify major browsers. | Test Chrome, Edge/Safari, Android/iOS browser. | No hydration/runtime console errors. |  |  |  |
