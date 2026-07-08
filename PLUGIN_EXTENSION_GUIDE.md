# Plugin Extension Guide

Supported extension points:

- Dashboard Card
- Sidebar
- Header Action
- Settings Page
- Report Page
- Floating Panel
- Toolbar Button
- Status Badge
- Quick Action
- Context Menu
- Widget
- Dialog
- Panel

Each contribution must include plugin id, feature flag, permissions, label, priority where useful, and a lazy `load` function.

Routes must be lazy, permission scoped, and removed when the plugin unloads.
