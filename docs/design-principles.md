---
title: Design Principles
status: active
last_updated: 2026-03-05
---

# ChefVault — Design Principles

## Core Principles Applied

### SOLID

- **Single Responsibility**: Each component does one thing. RecipeCard renders a card. SearchBar handles search input. Screens compose components.
- **Open/Closed**: Theme constants allow visual changes without modifying components. Filter system extensible via new chip options.
- **Liskov Substitution**: All screens follow consistent layout patterns (header → content → optional footer).
- **Interface Segregation**: Zustand store exposes focused selectors — screens only subscribe to the data they need.
- **Dependency Inversion**: Business logic (scaling, aggregation) is in pure functions (`src/lib/`), decoupled from UI and data layer.

### DRY

- Theme constants centralize all colors, spacing, typography, and border radii.
- Shared components (RecipeCard, SearchBar, FilterChips) eliminate duplication across screens.
- Recipe form logic shared conceptually between Create and Edit screens.

### KISS

- StyleSheet.create() over complex styling solutions — zero runtime overhead.
- File-based routing (Expo Router) — routes mirror the filesystem, no routing config files.
- Zustand over Redux — minimal boilerplate, no action creators or reducers.

### YAGNI

- No offline sync (yet) — mock data via Zustand is sufficient for MVP.
- No dark/light toggle — dark-only for MVP matches the professional kitchen context.
- No NativeWind — StyleSheet is simpler and the extra dependency isn't justified yet.

## UI/UX Principles

| Principle           | Application                                                       |
| ------------------- | ----------------------------------------------------------------- |
| Speed               | No network calls in MVP. All interactions are instant.            |
| Clarity             | Uppercase labels, monospace quantities, clear section headings.   |
| Structured Data     | Ingredients as table rows, steps as numbered items.               |
| Minimal Taps        | FAB for create, inline filter chips, haptic feedback on actions.  |
| Professional UX     | Dark theme, tight spacing, data-dense layouts.                    |
