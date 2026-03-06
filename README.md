# ChefVault

Professional recipe management for the kitchen. Part of the **Winery Apps / Kitchen** suite.

ChefVault replaces scattered notebooks and spreadsheets with a fast, structured recipe database built for chefs — featuring automatic scaling, food‑cost tracking, and prep‑list generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Expo](https://expo.dev) (SDK 54) / React Native 0.81 |
| Navigation | Expo Router (file‑based, typed routes) |
| State | Zustand 5 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Animations | React Native Reanimated 4 |
| Language | TypeScript (strict) |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npx expo start
```

Scan the QR code with **Expo Go** (iOS / Android) or press `i` / `a` to open a simulator.

### Environment

Create a `.env` at the project root (not committed):

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Project Structure

```
app/                  # Expo Router screens & layouts
  (auth)/             # Auth flow
  (tabs)/             # Tab navigator — Library, Collections, Prep Lists, Settings
  recipe/             # Create / Edit / Detail screens
  collection/         # Collection management
  preplist/           # Prep list management
  settings/           # Profile, Subscription
src/
  components/         # Shared UI components
    animated/         # Reanimated helpers (FAB, list items, swipeable rows)
    prep/             # Prep‑list specific components
    settings/         # Settings specific components
  constants/          # Theme tokens, spacing, typography
  hooks/              # Custom hooks (theme, unsaved‑changes guard, etc.)
  lib/                # Supabase client, storage helpers
  stores/             # Zustand stores (recipes, auth, toast)
  types/              # Shared TypeScript types & enums
docs/                 # Project documentation (briefs, architecture, progress)
```

## Key Features

- **Recipe Library** — search, filter by cuisine, multi‑select batch delete
- **Automatic Scaling** — proportional ingredient adjustment with unit conversion
- **Collections** — many‑to‑many recipe grouping
- **Prep Lists** — cross‑recipe ingredient aggregation for service planning
- **Food Cost Tracking** — per‑ingredient costing with recipe‑level roll‑up *(Pro)*
- **System / Light / Dark Theme** — respects OS preference, persisted via AsyncStorage
- **Haptic Feedback** — tactile responses on key interactions

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production‑ready releases |
| `dev`  | Active development & integration |

Feature branches are cut from `dev` and merged back via PR.

## License

Private — all rights reserved.
