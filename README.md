# Inmobi — Frontend

Plataforma de gestión inmobiliaria con React, React Router v6, Tailwind CSS, Tremor v3 y Supabase.

## Requisitos

- Node.js 18+
- Proyecto Supabase con tabla `public.perfiles` (campo `rol`: `admin` | `inquilino`)

## Instalación

```bash
npm install
# Crear .env en la raíz con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Estructura del proyecto

```
src/
├── supabaseClient.js       # Cliente Supabase
├── contexts/
│   └── AuthContext.jsx   # Sesión, usuario y rol global
├── guards/
│   ├── ProtectedRoute.jsx
│   ├── AdminRoute.jsx
│   └── InquilinoRoute.jsx
├── layouts/
│   ├── AdminLayout.jsx
│   └── InquilinoLayout.jsx
├── components/
│   ├── admin/
│   ├── inquilino/
│   └── icons/
├── pages/
│   ├── auth/
│   ├── admin/
│   └── inquilino/
├── routes/
│   └── AppRouter.jsx
└── data/
    └── mockData.js
```

## Rutas

| Ruta | Acceso |
|------|--------|
| `/login` | Público |
| `/admin/*` | Solo `rol = admin` |
| `/inquilino/*` | Solo `rol = inquilino` |

Un inquilino que intente acceder a `/admin/*` es redirigido a `/inquilino/dashboard`.

## Deploy en Vercel

1. Push del repo a GitHub/GitLab/Bitbucket.
2. [vercel.com](https://vercel.com) → **Add New Project** → importar el repo.
3. Vercel detecta Vite: **Build** `npm run build`, **Output** `dist` (no cambiar).
4. **Environment Variables** (manual, ver `.env.example`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   Marcá Production (y Preview si querés).
5. Deploy.
6. Supabase → **Authentication → URL Configuration** → **Site URL** = `https://tu-proyecto.vercel.app` (la URL que te asigne Vercel).

El archivo `vercel.json` reescribe todas las rutas a `index.html` (React Router).
