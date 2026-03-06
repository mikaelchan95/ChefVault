---
title: Active Development
status: active
last_updated: 2026-03-06
---

# ChefVault — Active Development

## Current Phase

**Phase 1: MVP Foundation** — Complete. All core features, Supabase integration, and app polish done.

## Current Focus

- All CRUD fully Supabase-backed (recipes, collections, prep lists, ingredients, steps)
- Auth flow complete (email/password, OAuth, password reset, account deletion)
- Free plan recipe limit enforced (50 recipes, server + client)
- Data export functional
- All settings screens wired to real backends

## Recent Changes (2026-03-05)

### Session 1: Initial Scaffolding
1. Initialized Expo project with TypeScript strict mode
2. Created all configuration files (package.json, app.json, tsconfig, babel.config)
3. Built 4-tab bottom navigation (Recipes, Collections, Prep Lists, Settings)
4. Implemented Recipe Library screen with search + filter chips
5. Implemented Recipe Detail screen with scaling controls + ingredient table + method steps
6. Implemented Create Recipe and Edit Recipe screens (modal presentation)
7. Implemented Collections screen (basic grid)
8. Implemented Prep Lists screen (basic checklist)
9. Implemented Settings screen with account, preferences, data sections
10. Created reusable components: RecipeCard, SearchBar, FilterChips
11. Set up Zustand store with 5 mock recipes (full ingredients + steps)
12. Built recipe scaling engine (proportional scaling, unit conversion, kitchen rounding)
13. Set up Supabase client placeholder (not connected yet)

### Session 2: Collections & Prep Lists Build-out
14. Enhanced Collection type: added `recipe_ids`, `description`, `color`, `icon`, `created_at`, `updated_at`
15. Enhanced PrepList type: added `status`, `updated_at`
16. Added `CollectionFormData` and `PrepListFormData` types
17. Full Collection CRUD in store: add, update, delete, addRecipeToCollection, removeRecipeFromCollection, getCollectionById, getCollectionRecipes
18. Full PrepList CRUD in store: createPrepListFromRecipes (auto-generates items via ingredient aggregation + station assignment), updatePrepList, deletePrepList, addPrepItem, removePrepItem, updatePrepItem
19. Built Collection Detail screen (`app/collection/[id].tsx`): colored hero, stats, recipe list, "Manage Recipes" modal, delete collection
20. Built Create Collection modal (`app/collection/create.tsx`): name, description, status toggle, color picker, live preview card
21. Built Create Prep List flow (`app/preplist/create.tsx`): recipe picker grid, preview with station breakdown, generate button
22. Wired up Collections tab: card press → detail, FAB/New → create modal
23. Wired up Prep Lists tab: FAB → create flow, delete list, progress bar
24. Registered new routes: `collection/[id]`, `collection/create`, `preplist/create`
25. Updated `CollectionCard` to use `recipe_ids.length` instead of `recipe_count`

### Session 3: Unlimited Recipes & Ingredient Costing
26. Created costing calculation library (`src/lib/costing.ts`): `calculateRecipeCost`, `formatCurrency`, `calculateScaledCost`
27. Added cost-per-unit input field to Create Recipe ingredient rows
28. Added cost-per-unit input field to Edit Recipe ingredient rows (pre-populates existing costs)
29. Added "Cost" column to Recipe Detail ingredient table (per-line cost with scaling support)
30. Added Cost Analysis section to Recipe Detail: Total Cost, Per Serving, partial costing badge
31. Added cost display to RecipeCard meta row (shows total recipe cost)
32. Added realistic cost_per_unit data to all 29 mock ingredients across 5 recipes
33. Updated user plan from `free` to `pro`
34. Replaced Settings upgrade CTA with Active Features section (Unlimited Recipes, Ingredient Costing, Team Sync coming soon)
35. Added recipe count badge to Recipe Library header

### Session 7: Supabase Storage — Image Upload Integration
36. Created `avatars` storage bucket on Supabase (public, 2MB limit, jpeg/png/webp/heic)
37. Added RLS policies for `avatars` bucket (insert/update/delete scoped to `auth.uid()`, public read)
38. Created `src/lib/storage.ts` — upload utility (`uploadImage`, `uploadImages`, `isLocalUri`)
    - Converts local `file://` URI → ArrayBuffer → Supabase Storage upload → returns public URL
    - Supports both `recipe-images` and `avatars` buckets
    - Path convention: `{user_id}/{timestamp}.{ext}` (matches RLS folder policy)
39. Wired Supabase Storage into PlatingPhotos component:
    - Photos auto-upload in background immediately on pick (camera or gallery)
    - Loading spinner overlay on thumbnails during upload
    - Local URI replaced with public URL via `onPhotosChange` callback
    - Uses `useRef` for stale-closure safety on concurrent uploads
40. Added safety-net `uploadImages()` call in recipe create and edit `handleSave`:
    - Catches any remaining local URIs before DB persist (if background upload not yet complete)
41. Wired Supabase Storage into profile avatar flow:
    - Avatar uploaded to `avatars` bucket on save (before writing `profiles.avatar_url`)
    - `isLocalUri` check skips re-upload if URL already remote
42. Fixed profile avatar rendering: replaced `<MaterialIcons>` stub with `<Image>` from expo-image
43. Fixed settings tab avatar: renders `<Image>` from `profile.avatar_url` when present, falls back to person icon

### Session 8: Supabase Offloading & App Completion
44. Created `delete_user_account()` SECURITY DEFINER DB function via migration — cascades all user data + storage + auth record
45. Created `check_recipe_limit()` trigger on recipes INSERT — enforces 50-recipe cap for free plan
46. Dropped duplicate `profiles_updated_at` trigger (kept `update_profiles_updated_at`)
47. Fixed `authStore.deleteAccount()` — now calls `supabase.rpc('delete_user_account')` before sign-out
48. Fixed `addPrepItem` ID mismatch bug — now uses `.select().single()` to get DB-generated ID
49. Added client-side recipe limit pre-flight check in `addRecipe` (fetches plan from profiles)
50. Created `src/lib/export.ts` — data export utility using expo-file-system + expo-sharing
51. Fixed security screen: current password re-auth via `signInWithPassword` before password change
52. Wired data backup screen: "Export All Data" and "Backup Now" buttons functional
53. Fixed subscription screen: removed mock billing data, added plan toggle (placeholder for real billing)
54. Implemented share recipe handler using React Native Share API
55. Added edit collection modal in collection detail (name, description, status, save/cancel)
56. Added pull-to-refresh (RefreshControl) on all 3 tab screens
57. Replaced prep list date TextInput with `@react-native-community/datetimepicker`
58. Replaced cuisine TextInput with horizontal chip selector using CuisineType constants (create + edit)
59. Replaced unit TextInput with modal picker using UnitType constants (create + edit)
60. Fixed PlatingPhotos fullscreen viewer swipe counter (added onScroll handler)
61. Fixed edit recipe save bar hardcoded background color (now uses theme card color)
62. Added skeleton loading state to collections tab
63. Added optional `preferredSystem` parameter to `scaleIngredient` for unit preference support
64. Installed new dependencies: expo-sharing, expo-file-system, @react-native-community/datetimepicker

### Session 9: Imperial/Metric Unit Conversion
65. Built full imperial↔metric conversion engine in `src/lib/scaling.ts`:
    - Unified `UNIT_META` lookup table with system, category, and base conversion factors
    - `convertToSystem()` — standalone unit conversion function (g↔oz, kg↔lb, ml↔tsp/tbsp/cup, L↔cup)
    - `selectBestUnit()` — picks optimal target unit based on quantity thresholds
    - `promoteMetric()` — g→kg, ml→L promotion when ≥1000
    - Standard culinary conversions: 1oz=28.35g, 1lb=453.59g, 1tsp=4.93ml, 1tbsp=14.79ml, 1cup=236.59ml
66. Updated `scaleRecipeIngredients()` to accept and forward `preferredSystem` parameter
67. Wired user's `default_units` profile preference into Recipe Detail screen
68. Added inline Metric/Imperial segmented toggle on Recipe Detail (between Scaling and Ingredients sections)
69. "Scaled" badge now shows when either servings changed or unit system converted

## Next Steps

1. **Drag-to-reorder** — Ingredient and step reordering in editor (react-native-gesture-handler)
2. **PDF export** — Generate PDF from recipes and prep lists (Pro feature)
3. **Payment integration** — RevenueCat or Stripe for Pro subscription billing
4. **Image compression** — Resize photos before upload to reduce storage costs
5. **i18n framework** — Wire language setting to actual localization (react-i18next)
6. **Costing enhancements** — Ingredient price database, currency selection, margin calculator
7. **Storage cleanup** — Orphan image cleanup (cron/edge function) for abandoned uploads
8. **Offline-first** — AsyncStorage cache layer for offline read/write with sync

## Open Decisions

- Timer functionality: in-app countdown vs. OS alarm integration?
- Search implementation: client-side vs. Supabase full-text search?
- Costing currency: hard-coded USD vs. user-configurable currency?
- Payment provider: RevenueCat (simpler) vs. Stripe (more control)?
