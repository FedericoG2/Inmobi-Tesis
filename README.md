# Inmobi

Sistema web de gestión de alquileres desarrollado para Zitelli & Asociados S.R.L. Centraliza la administración de propietarios, propiedades, inquilinos y contratos. También cubre el cobro mensual de alquileres, la actualización de montos por IPC o ICL y la gestión de reclamos, e incluye portales de consulta para inquilinos y propietarios.

La documentación funcional del proyecto (alcance, requisitos, casos de uso y modelo de datos) se encuentra en [`final/G1_Inmobi_Gonzalez_Favre_Gomez_0274.pdf`](final/G1_Inmobi_Gonzalez_Favre_Gomez_0274.pdf). La descripción técnica detallada (capas, rutas, tablas, funciones y reglas de negocio) está en [`docs/CONTEXTO_PROYECTO.md`](docs/CONTEXTO_PROYECTO.md).

## Módulos

| Módulo | Alcance |
|--------|---------|
| Acceso | Inicio de sesión por rol y recuperación de contraseña mediante un enlace enviado por email. |
| Cuentas | Alta, consulta y modificación de cuentas de usuario (email y rol), bloqueo y restablecimiento de contraseña. |
| Propietarios, Propiedades, Inquilinos | Registro, consulta, modificación y eliminación, con validación de datos y control de integridad. |
| Contratos | Alta con documentación adjunta, vigencia (programado, activo, cerrado) y cierre por finalización, rescisión o cancelación. |
| Alquileres | Un período de pago por mes y contrato. El inquilino carga los comprobantes y el Encargado confirma el pago. |
| Aumentos | Cálculo por IPC o ICL con índices oficiales (Argly) o cargados manualmente, revisión y confirmación. |
| Reclamos | Registro, seguimiento por estados e historial de gestión. |
| Auditoría | Registro de altas, modificaciones y bajas de contratos, períodos, aumentos, comprobantes y reclamos, con usuario, fecha, valor anterior y valor nuevo. |
| Portal del inquilino | Contrato, documentos, pagos, carga de comprobantes y reclamos. |
| Portal del propietario | Consulta de propiedades, alquileres, pagos, aumentos y documentos. |

## Tecnologías

- **Frontend:** React 18, Vite 8, React Router 6, Tailwind CSS 4, Tremor 3 (tablas), Motion y jsPDF (comprobantes en PDF).
- **Backend:** Supabase.
  - PostgreSQL con Row Level Security; las reglas de negocio se implementan con triggers y funciones RPC.
  - Auth, Storage, Realtime y Edge Functions (Deno).
  - pg_cron para tareas programadas.
- **Pruebas:** Vitest y PGlite (PostgreSQL embebido).

## Requisitos

- Node.js 20.19 o superior (o 22.12 o superior).
- Un proyecto de Supabase.
- Supabase CLI, solo para desplegar las Edge Functions.

## Instalación local

```bash
npm install
cp .env.example .env
npm run dev
```

Variables de entorno (`.env`):

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) del proyecto. |

El frontend utiliza exclusivamente la clave pública; el control de acceso lo resuelve la base de datos mediante RLS. La clave `service_role` nunca se incluye en variables `VITE_` ni en el repositorio.

## Base de datos

### Migraciones

`supabase/migrations/` contiene el esquema completo en SQL incremental. Las migraciones se aplican en orden de nombre desde el SQL Editor de Supabase. Los archivos `_down.sql` revierten la migración del mismo nombre.

### Edge Functions

| Función | Uso |
|---------|-----|
| `gestionar-cuentas` | Administración de cuentas de Supabase Auth. Solo la invoca el Administrador de sistema. |
| `obtener-indices-argly` | Consulta de las series de IPC e ICL publicadas por Argly. Requiere sesión iniciada. |

```bash
supabase functions deploy gestionar-cuentas --project-ref <ref>
supabase functions deploy obtener-indices-argly --project-ref <ref>
```

### Tareas programadas (pg_cron)

| Tarea | Horario (UTC) | Función |
|-------|---------------|---------|
| `activar-contratos-programados` | 03:05 diario | Activa los contratos cuya fecha de inicio llegó. |
| `generar-periodos-alquiler` | 03:10 diario | Genera el período del mes de cada contrato activo. |

### Datos de demostración

| Archivo | Contenido |
|---------|-----------|
| `supabase/seeds/demo_01_presentacion.sql` | Cartera de ejemplo con contratos, pagos, aumentos y reclamos. Las fechas se calculan a partir del día de ejecución y el script se puede volver a ejecutar. |
| `supabase/seeds/demo_00_limpiar.sql` | Elimina todos los datos de negocio. Es opcional. |

El procedimiento de la demostración se describe en [`docs/GUION_DEMO.md`](docs/GUION_DEMO.md).

## Roles y control de acceso

El rol de cada usuario se almacena en `public.perfiles.rol`. No existe registro público: las cuentas las crea el Administrador de sistema.

| Ruta | Rol | Funciones |
|------|-----|-----------|
| `/login` | Público | Inicio de sesión y solicitud del enlace de recuperación de contraseña. |
| `/restablecer-contrasena` | Público | Alta de la contraseña nueva. Solo se accede con el enlace de recuperación. |
| `/cuentas` | `admin` | Administración de cuentas. |
| `/admin/*` | `encargado` | Panel de gestión de todos los módulos. |
| `/inquilino/*` | `inquilino` | Portal del inquilino. |
| `/propietario/*` | `propietario` | Portal del propietario (solo consulta). |

Las rutas se protegen en el frontend por rol. La base de datos aplica las mismas restricciones con RLS y valida cada operación crítica en el servidor.

## Estructura del repositorio

```
src/
  contexts/     sesión, rol y contexto de cada portal
  guards/       protección de rutas por rol
  layouts/      estructura del panel y de los portales
  pages/        pantallas por rol (auth, cuentas, admin, inquilino, propietario)
  components/   componentes por módulo y componentes de interfaz (ui/)
  hooks/        estado y acciones de cada módulo
  services/     acceso a Supabase (tablas, RPC, Storage, Edge Functions)
  utils/        lógica sin interfaz: cálculo de aumentos, validaciones, generación de PDF
supabase/
  migrations/   esquema y reglas de negocio
  functions/    Edge Functions
  seeds/        datos de demostración
tests/
  unit/         pruebas de lógica del frontend
  db/           pruebas de la base de datos
scripts/        create-admin-user.mjs
docs/           documentación técnica y guion de la demostración
final/          documento final del proyecto
```

## Pruebas

```bash
npm test
npm run lint
```

- `tests/unit/`: cálculo de aumentos por IPC e ICL, plazos de la bandeja de aumentos, estados de pago, reglas de pantalla, validaciones de formularios y recuperación de contraseña.
- `tests/db/`: ejecutan el SQL real de `supabase/migrations/` sobre PGlite. Verifican triggers, funciones, políticas RLS y de Storage, auditoría y la carga de los datos de demostración, y no acceden a la base de producción.
  - `reglas.test.js`: propiedades, contratos, aumentos, reclamos, cuentas y permisos.
  - `alquileres.test.js`: períodos, comprobantes, confirmación de pagos y portal del propietario.
  - `alineacion.test.js`: auditoría, cierre de contratos, índices manuales, revisión de aumentos y bloqueo del pago con aumento pendiente.
  - `demo.test.js`: carga de los datos de demostración.

## Despliegue

### Frontend (Vercel)

1. Importar el repositorio en Vercel. El preset de Vite configura el build (`npm run build`) y la salida (`dist`).
2. Definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Environment Variables.
3. `vercel.json` redirige todas las rutas a `index.html` para que React Router resuelva la navegación.

### Supabase

1. Aplicar las migraciones de `supabase/migrations/` en orden.
2. Desplegar las Edge Functions.
3. En Authentication > URL Configuration, configurar como Site URL el dominio del frontend y agregar en Redirect URLs `https://<dominio>/restablecer-contrasena` (y `http://localhost:5173/restablecer-contrasena` para desarrollo).
4. En Authentication > Emails > SMTP Settings, configurar un servidor SMTP propio. El servicio de email incluido en Supabase solo envía a direcciones del equipo del proyecto y tiene un límite de pocos envíos por hora, por lo que no alcanza para la recuperación de contraseña de los usuarios.
5. En Authentication > Sign In / Providers, desactivar "Allow new users to sign up".
6. Crear la primera cuenta de Administrador de sistema. El script lee `VITE_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del `.env` local. Esa clave no se versiona y solo se usa para este paso.

   ```bash
   node scripts/create-admin-user.mjs <email> <contraseña>
   ```

   El resto de las cuentas se crea desde la pantalla Cuentas.
