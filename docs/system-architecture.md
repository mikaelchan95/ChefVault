---
title: System Architecture
status: active
last_updated: 2026-03-05
---

# ChefVault — System Architecture

## Architecture Overview

ChefVault follows a **layered mobile architecture** optimized for Expo Router's file-based routing:

```
┌─────────────────────────────────┐
│         Expo Router (app/)       │  Routes & Screens
├─────────────────────────────────┤
│         Components (src/)        │  Reusable UI
├─────────────────────────────────┤
│      Zustand Stores (src/)       │  Client State
├─────────────────────────────────┤
│      Lib / Services (src/)       │  Business Logic
├─────────────────────────────────┤
│        Supabase Client           │  Data Access
└─────────────────────────────────┘
```

## Key Patterns

### State Management — Zustand

- **recipeStore**: Recipes, collections, prep lists, search/filter state, full CRUD
- Collection actions: add, update, delete, addRecipeToCollection, removeRecipeFromCollection
- Prep list actions: createPrepListFromRecipes (auto-aggregates ingredients), toggle/add/remove/update items
- Stores are client-side only (MVP); will sync to Supabase in Phase 2
- Selectors return stable references; derived data computed via useMemo in components

### Navigation — Expo Router

- File-based routing: `app/` directory structure maps 1:1 to routes
- Tab navigator for primary navigation (4 tabs)
- Stack navigator for recipe detail, create, and edit screens
- Modal presentation for create/edit workflows

### Styling — Theme Constants + StyleSheet

- Centralized color palette, spacing, typography in `src/constants/theme.ts`
- StyleSheet.create() for all component styles (no CSS-in-JS runtime overhead)
- Design tokens derived from Stitch mockups (variant-b)

### Recipe Scaling — Pure Functions

- `src/lib/scaling.ts` contains stateless scaling/aggregation logic
- Kitchen-friendly rounding (whole numbers for large, fractions for small)
- Automatic unit conversion at thresholds (g→kg, ml→L)

## Database Schema

See @File(./product-spec.md) §7 for full schema.

**Tables:** users, recipes, ingredients, steps, collections, collection_recipes

**Key relationships:**
- users → recipes (1:N)
- recipes → ingredients (1:N, ordered by sort_order)
- recipes → steps (1:N, ordered by step_number)
- collections ↔ recipes (M:N via collection_recipes join table)

## Security Model (Planned)

- Supabase RLS policies: users can only access their own data
- Auth via Supabase Auth (email/password initially)
- API keys stored as environment variables, never committed

## Future Architecture Considerations

- **Offline-first**: AsyncStorage cache layer → sync on reconnect
- **Real-time**: Supabase real-time subscriptions for team collaboration
- **File uploads**: Supabase Storage for recipe images
