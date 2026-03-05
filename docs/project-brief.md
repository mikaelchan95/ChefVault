---
title: Project Brief
status: active
last_updated: 2026-03-05
---

# ChefVault — Project Brief

## Purpose

ChefVault is a mobile-first recipe management application built for professional kitchen environments. It replaces scattered notebooks, spreadsheets, and photos with a centralized, structured recipe database designed for speed and minimal interaction friction.

## Goals

1. **Centralized recipe storage** — structured documents (not free-form text) with metadata, ingredients, and method steps
2. **Automatic recipe scaling** — proportional ingredient adjustments with unit conversion
3. **Food cost tracking** — per-ingredient costing with recipe-level roll-up (Pro feature)
4. **Collection-based organization** — many-to-many recipe grouping
5. **Prep list generation** — cross-recipe ingredient aggregation for service planning

## Scope (MVP)

- Recipe Library with search and filtering
- Recipe Detail view with scaling controls
- Create / Edit recipe workflow
- Collections management
- Prep list builder with ingredient aggregation
- Settings and account management
- Freemium model (Free: 50 recipes, Pro: unlimited + costing + prep lists + export)

## Target Users

- Professional chefs (line, sous, executive)
- Restaurant kitchens
- Private chefs
- Culinary students

## Key Requirements

- Dark theme, professional "tool" aesthetic
- iOS and Android via Expo (React Native)
- Supabase backend (PostgreSQL, Auth, Storage)
- Offline-first capability (future phase)
- Sub-second interactions — no loading walls
