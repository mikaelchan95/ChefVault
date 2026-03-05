---
title: Tech Context
status: active
last_updated: 2026-03-05
---

# ChefVault — Tech Context

## Stack

| Layer           | Technology                           | Version  |
| --------------- | ------------------------------------ | -------- |
| Framework       | Expo (React Native)                  | SDK 54   |
| React           | React                                | 19.1.0   |
| React Native    | React Native                         | 0.81.5   |
| Routing         | Expo Router                          | v6       |
| Language        | TypeScript                           | ~5.9     |
| Backend         | Supabase                             | v2.49+   |
| Database        | PostgreSQL (via Supabase)            | —        |
| Authentication  | Supabase Auth                        | —        |
| File Storage    | Supabase Storage                     | —        |
| State           | Zustand                              | v5       |
| Icons           | @expo/vector-icons (MaterialIcons)   | v15      |
| Fonts           | @expo-google-fonts/inter             | —        |
| Navigation      | @react-navigation (via Expo Router)  | v7       |
| Haptics         | expo-haptics                         | v15      |
| Animations      | react-native-reanimated              | v4.1     |

## Project Structure

```
ChefVault/
├── app/                    # Expo Router file-based routes
│   ├── _layout.tsx         # Root Stack layout (fonts, splash)
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── _layout.tsx     # Tab configuration
│   │   ├── index.tsx       # Recipe Library (main screen)
│   │   ├── collections.tsx # Collections grid
│   │   ├── prep-lists.tsx  # Prep list builder
│   │   └── settings.tsx    # Settings screen
│   ├── recipe/
│   │   ├── [id].tsx        # Recipe detail (dynamic route)
│   │   ├── create.tsx      # New recipe form (modal)
│   │   └── edit/[id].tsx   # Edit recipe form (modal)
│   ├── collection/
│   │   ├── [id].tsx        # Collection detail (recipes in collection)
│   │   └── create.tsx      # New collection form (modal)
│   └── preplist/
│       └── create.tsx      # New prep list (recipe picker, modal)
├── src/
│   ├── components/         # Reusable UI components
│   ├── constants/          # Theme colors, spacing, typography
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Supabase client, scaling logic, utils
│   ├── stores/             # Zustand state stores
│   └── types/              # TypeScript type definitions
├── assets/                 # App icons, splash screen
├── docs/                   # Project documentation
└── stitch/                 # Design mockups (HTML)
```

## Setup & Run

```bash
npm install
npx expo start           # Dev server
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
```

## Environment Variables

| Variable                        | Description            |
| ------------------------------- | ---------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase project URL   |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Dependencies

- Path alias `@/*` maps to project root (configured in tsconfig.json)
- Reanimated v4 plugin handled automatically by babel-preset-expo (no manual babel config needed)
- react-native-worklets required as peer dependency of Reanimated v4
- Expo Router uses file-based routing from `app/` directory
- Entry point: `expo-router/entry` (configured in package.json `main`)

## Constraints

- Portrait orientation only (kitchen use)
- Dark mode only (MVP)
- No NativeWind — uses StyleSheet.create() with theme constants for performance
- Supabase client not yet connected (using mock data via Zustand)
