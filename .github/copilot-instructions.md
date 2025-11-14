# Kalorix Hub - AI Coding Agent Instructions

## Project Overview
Kalorix Hub is a **dual-portal nutrition tracking platform** with separate user experiences for **clients** (WhatsApp magic-link auth) and **nutritionists** (email/password auth). Built with React + TypeScript + Vite + Supabase, deployed on Vercel.

**Core Purpose:** Clients track meals/workouts; nutritionists monitor multiple clients through a centralized dashboard.

## Architecture

### Dual Authentication System
- **Clients**: WhatsApp-based magic links → stored in `localStorage.sessionPhone` → verified via `useRequireAuth()` hook
  - Login flow: `Login.tsx` → N8N webhook → `AuthCallback.tsx` → Dashboard
  - Phone numbers normalized to `55XXXXXXXXXXX` format (BR country code) via `src/lib/phone.ts`
- **Nutritionists**: Supabase Auth (email/password) → `auth.uid()` in RLS policies
  - Routes: `/nutritionist/login`, `/nutritionist/signup`, `/nutritionist/dashboard`
  - Auth handled by `useNutritionistAuth()` hook and `src/lib/auth.ts`
  
### Database Structure (Supabase PostgreSQL)
**Key Tables:**
- `users`: Both clients and nutritionists, differentiated by `user_type` ('client'|'nutritionist')
  - Clients: `telefone` (unique when not null), `share_code` (format: `KALO-XXXX-YYYY`)
  - Nutritionists: `email` (unique), `telefone` is null
- `nutritionists`: Extended profile for nutritionists (CRN, specialization, etc.)
- `nutritionist_clients`: Many-to-many relationship between nutritionists and clients
- `registros_alimentares`: Client meal entries with macros
- `registros_treino`: Client workout logs
- `dietas`: Client daily targets (calories, macros)
- `magic_links`: Temporary tokens for WhatsApp auth

**Critical RLS:** Row-level security policies isolate nutritionist data. Nutritionists can only see their linked clients via `nutritionist_clients` joins.

### Share Code System
Clients get unique codes (`KALO-XXXX-YYYY`) stored in `users.share_code`. Nutritionists add clients by entering this code → creates `nutritionist_clients` record.
- Validation: `src/lib/shareCode.ts` - `validateShareCode()`, `formatShareCode()`
- Backend: `add_client_by_share_code` RPC function

### Data Fetching Pattern
**React Query** (`@tanstack/react-query`) for all server state:
- QueryClient configured in `App.tsx` with 5min stale time
- Hooks in `src/hooks/`:
  - `useDashboardData()` - Fetches client daily stats via `get_dashboard_data_today_brt` RPC (fixes timezone to America/Sao_Paulo)
  - `useNutritionistClients()` - Fetches nutritionist's client list with metrics
  - `useMealDiary()` - CRUD for food entries
  - `useWorkoutLog()` - CRUD for exercise logs
  - `useProfile()` - User profile management

**RPC Functions:** Timezone-aware queries run through Supabase stored procedures (e.g., `get_dashboard_data_today_brt` forces BRT timezone).

## Development Workflow

### Environment Variables (`.env.local`)
```
VITE_SUPABASE_URL=<supabase_project_url>
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_N8N_MAGIC_WEBHOOK_URL=<n8n_webhook_for_whatsapp>
VITE_PUBLIC_SITE_URL=<production_url>
```

### Running the Project
```bash
npm run dev        # Dev server on port 8080
npm run build      # Production build
npm run preview    # Preview production build
```

### File Structure
```
src/
├── lib/               # Core utilities
│   ├── supabaseClient.ts   # Single Supabase client instance
│   ├── auth.ts             # Authentication logic (both types)
│   ├── shareCode.ts        # Share code validation/formatting
│   └── nutritionistMetrics.ts  # IMC, adherence calculations
├── hooks/             # Custom React hooks (React Query)
├── pages/
│   ├── nutritionist/       # Nutritionist portal pages
│   └── dashboard/          # Client portal pages
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── nutritionist/       # Nutritionist-specific components
│   └── dashboard/          # Client-specific components
└── App.tsx            # Routes + QueryClient setup
```

## Code Conventions

### TypeScript Configuration
- `noImplicitAny: false` - Permissive, but prefer typing when practical
- `strictNullChecks: false` - Null safety not enforced
- Path alias: `@/*` → `src/*`

### Styling
- **Tailwind CSS** + **shadcn/ui** components
- Dark mode support via `next-themes`
- Import components from `@/components/ui/*`

### State Management
- Server state: React Query (hooks in `src/hooks/`)
- Local state: React `useState`, `localStorage` for session
- No global state library

### Supabase Patterns
```typescript
// Always use the shared client
import { supabase } from '@/lib/supabaseClient';

// RPC calls (preferred for complex queries)
const { data, error } = await supabase.rpc('function_name', { param: value });

// Direct table access with RLS
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);
```

### Error Handling
- Use `toast` from `sonner` for user feedback
- Console errors for debugging: `console.error('Context:', error)`
- React Query handles loading/error states automatically

## Common Pitfalls

1. **Timezone Issues**: Client meal queries must use `get_dashboard_data_today_brt` RPC, not raw SQL with `CURRENT_DATE`
2. **Phone Normalization**: Always use `normalizePhone()` from `src/lib/phone.ts` before database operations
3. **RLS Policies**: Nutritionist queries fail without proper `nutritionist_clients` joins. See `useNutritionistClients.ts` for isolation patterns.
4. **Magic Links**: Must update `used_at` timestamp to prevent reuse (handled in `auth.ts`)
5. **Share Code Format**: Must match `KALO-XXXX-YYYY` regex in `validateShareCode()`

## Database Migrations
Located in `migrations/` folder. Execute in order:
- `001_add_nutritionist_feature.sql` - Initial nutritionist tables
- `002-005_*.sql` - Fixes for RLS policies and constraints
- **Key Fix:** `005_simplify_nutritionist_signup.sql` removes `NOT NULL` from `users.telefone` for nutritionists

## Key Documentation Files
- `NUTRITIONIST_HUB_ARCHITECTURE.md` - Detailed system design
- `IMPLEMENTATION_COMPLETE.md` - Feature checklist
- `FIX_NUTRITIONIST_SIGNUP.md` - RLS policy debugging example

## When Implementing Features

1. **New API Calls**: Create custom hook in `src/hooks/` using React Query
2. **New Routes**: Add to `App.tsx` routing config, use appropriate layout (`DashboardLayout` or standalone)
3. **Client Data Access**: Always verify `localStorage.sessionPhone` exists via `useRequireAuth()`
4. **Nutritionist Data Access**: Use `supabase.auth.getUser()` for `auth.uid()` and join through `nutritionist_clients`
5. **UI Components**: Check `src/components/ui/` first (shadcn), then create custom in appropriate folder
