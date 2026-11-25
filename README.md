# Inmobi — Frontend

Sistema de gestión inmobiliaria para Zitelli & Asociados S.R.L.: propiedades, propietarios, inquilinos, contratos, alquileres (períodos y comprobantes de pago), aumentos por IPC/ICL y reclamos, con un portal para el inquilino y otro para el propietario.

Stack: React 18, Vite, React Router v6, Tailwind CSS 4 con un sistema de diseño propio (`src/components/ui` y `src/utils/ui.js`), Tremor v3 (tablas), Motion (animaciones del login) y Supabase (Auth, PostgreSQL con RLS, Storage, Realtime, Edge Functions y pg_cron).

> Contexto completo (capas, rutas, base de datos y reglas de negocio): [`docs/CONTEXTO_PROYECTO.md`](docs/CONTEXTO_PROYECTO.md).

## Requisitos

- Node.js 18 o superior
- Un proyecto de Supabase con las migraciones de `supabase/migrations/` aplicadas en orden

## Instalación

```bash
npm install
cp .env.example .env   # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

## Pruebas

```bash
npm test        # una corrida
npm run lint
```

- `tests/unit/`: fórmulas de IPC e ICL, plazos de la bandeja (del día 11 al día 10), estados de pago, portal del inquilino y validaciones.
- `tests/db/`: reglas de la base (triggers, funciones, RLS y políticas de Storage) ejecutadas sobre un Postgres embebido (PGlite) con el SQL de `supabase/migrations/`, y la carga de los datos de demo. No usan la base real.
  - `reglas.test.js`: propiedades, contratos, aumentos, reclamos, cuentas y permisos.
  - `alquileres.test.js`: períodos de alquiler, comprobantes, confirmación de pagos, portal del propietario y reglas de modificación.
  - `alineacion.test.js`: auditoría, cierre de contratos (finalizado, rescindido, cancelado), índices cargados a mano, revisión de aumentos y pago con aumento pendiente (RF-057).

## Roles y rutas

El rol se guarda en `public.perfiles.rol`. Las cuentas las crea el Administrador de sistema; no hay registro desde el login.

| Ruta | Rol | Qué hace |
|------|-----|----------|
| `/login` | Público | Inicio de sesión |
| `/cuentas` | `admin` (Administrador de sistema) | Alta de cuentas, rol, bloqueo y contraseña |
| `/admin/*` | `encargado` (Encargado de Alquileres) | Dashboard, propietarios, propiedades, inquilinos, contratos, alquileres, aumentos y reclamos |
| `/inquilino/*` | `inquilino` | Portal: alquiler, contrato y documentos, pagos (comprobantes), reclamos y perfil |
| `/propietario/*` | `propietario` | Portal: propiedades, alquileres (pagos, montos, aumentos y documentos) y perfil. Solo consulta |

Cada rol que entra a una ruta ajena vuelve a su pantalla de inicio. La base repite el control con RLS.

## Estructura

```
src/
├── contexts/      AuthContext (sesión y rol), PortalInquilinoContext, PortalPropietarioContext
├── guards/        ProtectedRoute, RolRoute y sus variantes por rol
├── layouts/       panel (sidebar + topbar) y portales del inquilino y del propietario
├── pages/         auth/, cuentas/, admin/, inquilino/, propietario/
├── components/    componentes por módulo
├── hooks/         estado y acciones de cada módulo
├── services/      acceso a Supabase (tablas, RPC, Storage, Edge Functions)
└── utils/         reglas de negocio sin interfaz (cálculo de aumentos, validaciones, PDF)
supabase/
├── migrations/    SQL incremental: aplicar en orden en el SQL Editor
├── functions/     gestionar-cuentas, obtener-indices-argly
└── seeds/         datos de demostración (ver docs/GUION_DEMO.md)
scripts/           create-admin-user.mjs (primera cuenta de Administrador)
final/             documento final del proyecto (PDF)
```

## Administrador de sistema inicial

La primera cuenta de Administrador de sistema se crea con la service role, que nunca va al navegador:

```bash
# .env con SUPABASE_SERVICE_ROLE_KEY (no se sube al repo)
node scripts/create-admin-user.mjs admin@ejemplo.com "una-contraseña-segura"
```

Las demás cuentas se crean desde la pantalla Cuentas.

## Deploy en Vercel

1. Push del repo a GitHub/GitLab/Bitbucket.
2. [vercel.com](https://vercel.com) → **Add New Project** → importar el repo.
3. Vercel detecta Vite: **Build** `npm run build`, **Output** `dist` (no cambiar).
4. **Environment Variables** (manual, ver `.env.example`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`  
   Marcá Production (y Preview si querés).
5. Deploy.
6. Aplicar las migraciones pendientes en orden desde el SQL Editor (entre ellas `20261008_actividad_sistema.sql`, `20261117000000_rol_propietario.sql`, `20261117000100_alquileres_y_portal_propietario.sql` y `20261120000000_alineacion_documento.sql`). La última crea el bucket privado `comprobantes-pago` y la tarea diaria que genera los períodos de alquiler.
7. Supabase → **Authentication → URL Configuration** → **Site URL** = `https://tu-proyecto.vercel.app` (la URL que te asigne Vercel).
8. Supabase → **Authentication → Sign In / Providers** → desactivar **Allow new users to sign up**. Las cuentas las crea solo el Administrador de sistema.
9. Desplegar las Edge Functions: `supabase functions deploy gestionar-cuentas` y `supabase functions deploy obtener-indices-argly`.

El archivo `vercel.json` reescribe todas las rutas a `index.html` (React Router).
