# Inmobi — Contexto del proyecto (para asistentes de IA)

Documento de referencia para que un asistente (Gemini, Cursor, etc.) entienda **cómo está organizado el repo**, **qué está conectado a Supabase** y **dónde viven las reglas de negocio**.

---

## 1. Qué es Inmobi

**Inmobi** es una plataforma de gestión inmobiliaria (tesis) con dos portales:

| Portal | Rol en `perfiles.rol` | Ruta base |
|--------|------------------------|-----------|
| Admin (inmobiliaria) | `admin` | `/admin/*` |
| Inquilino (cliente) | `inquilino` | `/inquilino/*` |

**Stack:** React 18 + Vite 8 + React Router v6 + Tailwind CSS 4 + Tremor v3 + Supabase (`@supabase/supabase-js`).

**Auth:** Supabase Auth (email/password). El rol no viene del JWT: se lee de `public.perfiles` tras el login (`AuthContext.jsx`).

---

## 2. Arranque local

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Variables de entorno (prefijo `VITE_` porque es Vite):

- `VITE_SUPABASE_URL` — URL del proyecto (ej. `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — clave pública (anon). **No** commitear `.env`.

---

## 3. Arquitectura en capas

El patrón se repite en casi todos los módulos admin:

```
Página (pages/admin/*.jsx)
    ↓ usa
Hook (hooks/use*.js)          ← estado React, loading, errores, refetch
    ↓ llama
Service (services/*Service.js) ← supabase.from(...), .rpc(...)
    ↓ usa
supabaseClient.js              ← createClient + isSupabaseConfigured
```

**Convenciones:**

- **Services:** funciones async puras (`listarX`, `crearX`, `actualizarX`, `eliminarX`). Si `supabase` es `null`, devuelven error amigable.
- **Hooks:** encapsulan `useState` + `useEffect` + acciones CRUD. Exponen `loading`, `error`, `submitting`, `submitError`, `refetch`.
- **Páginas:** layout de lista (`AdminListLayout`), tabla (`AdminDataTable`), modales de formulario (`components/admin/forms/*`), confirmaciones (`AdminConfirmModal`).
- **Utils:** lógica de negocio reutilizable sin UI (`src/utils/`).

---

## 4. Estructura de carpetas

```
Inmobi-Tesis/
├── .env.example
├── docs/
│   └── CONTEXTO_PROYECTO.md      ← este archivo
├── supabase/
│   ├── migrations/               ← SQL incremental (ejecutar en SQL Editor)
│   ├── seeds/                    ← datos demo (contratos ICL/IPC)
│   └── functions/
│       └── sync-argly-icl/       ← Edge Function índices ICL
├── src/
│   ├── main.jsx                  → monta App
│   ├── App.jsx                   → ErrorBoundary + AuthProvider + AppRouter
│   ├── supabaseClient.js
│   ├── index.css
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx       → sesión, rol, isAdmin, isInquilino
│   │
│   ├── guards/
│   │   ├── ProtectedRoute.jsx    → requiere login
│   │   ├── AdminRoute.jsx        → solo admin
│   │   └── InquilinoRoute.jsx    → solo inquilino
│   │
│   ├── routes/
│   │   └── AppRouter.jsx         → rutas lazy-loaded
│   │
│   ├── layouts/
│   │   ├── admin/                → sidebar + topbar
│   │   └── InquilinoLayout.jsx   → bottom nav móvil
│   │
│   ├── pages/
│   │   ├── auth/LoginPage.jsx
│   │   ├── admin/                → un archivo por módulo
│   │   └── inquilino/            → dashboard, reclamos, documentos
│   │
│   ├── components/
│   │   ├── admin/                → tablas, modales, layouts compartidos
│   │   ├── inquilino/
│   │   └── icons/
│   │
│   ├── hooks/                    → usePropietarios, usePropiedades, etc.
│   ├── services/                 → capa Supabase
│   ├── utils/                    → reglas de negocio puras
│   └── data/
│       └── mockData.js           → solo pantallas aún no conectadas
│
└── .cursor/rules/
    └── validaciones-y-supabase.mdc  → reglas front vs DB pendientes
```

---

## 5. Flujo de autenticación

```
LoginPage → supabase.auth.signInWithPassword
         → onAuthStateChange (AuthContext)
         → SELECT rol FROM perfiles WHERE id = auth.user.id
         → guards redirigen según isAdmin / isInquilino
```

- Sin fila en `perfiles` → pantalla "Cuenta sin rol asignado".
- Inquilino en `/admin/*` → redirige a `/inquilino/dashboard`.
- Admin en `/inquilino/*` → redirige a `/admin/dashboard`.

**Vinculación inquilino ↔ usuario:** tabla `inquilinos.perfil_id` (nullable). El admin ve si está "Vinculado"; no hay flujo automático de asignación al registrarse.

---

## 6. Rutas de la aplicación

| Ruta | Componente | Supabase |
|------|------------|----------|
| `/login` | `LoginPage` | Auth |
| `/admin/dashboard` | `AdminDashboard` | **Mock** (KPIs) |
| `/admin/propietarios` | `AdminPropietarios` | Conectado |
| `/admin/propiedades` | `AdminPropiedades` | Conectado |
| `/admin/inquilinos` | `AdminInquilinos` | Conectado |
| `/admin/contratos` | `AdminContratos` | Conectado |
| `/admin/aumentos` | `AdminAumentos` | Conectado (RPCs) |
| `/admin/reclamos` | `AdminReclamos` | Conectado |
| `/inquilino/dashboard` | `InquilinoDashboard` | **Mock** |
| `/inquilino/reclamos` | `InquilinoReclamos` | **Mock** |
| `/inquilino/documentos` | `InquilinoDocumentos` | **Mock** |

---

## 7. Módulos admin — mapa archivo a archivo

| Módulo | Página | Hook | Service |
|--------|--------|------|---------|
| Propietarios | `AdminPropietarios.jsx` | `usePropietarios.js` | `propietariosService.js` |
| Propiedades | `AdminPropiedades.jsx` | `usePropiedades.js` | `propiedadesService.js` |
| Inquilinos | `AdminInquilinos.jsx` | `useInquilinos.js` | `inquilinosService.js` |
| Contratos | `AdminContratos.jsx` | `useContratos.js` | `contratosService.js` |
| Reclamos | `AdminReclamos.jsx` | `useReclamos.js` | `reclamosService.js` |
| Aumentos | `AdminAumentos.jsx` | `useAumentos.js` | `aumentosService.js` + `arglyService.js` |

**Modales de formulario** (`src/components/admin/forms/`):

- `PropietarioFormModal.jsx`
- `PropiedadFormModal.jsx`
- `InquilinoFormModal.jsx`
- `ContratoFormModal.jsx` — el más complejo (ajustes ICL/IPC/manual, fechas, montos)
- `ReclamoFormModal.jsx`

**Componentes admin reutilizables:**

- `AdminListLayout` — título, subtítulo, botón "Nuevo"
- `AdminDataTable` — tabla con slots para celdas
- `TableRowActions` — editar / eliminar
- `AdminConfirmModal` — confirmación destructiva
- `AdminSearchSelect` — select con búsqueda (contratos)

---

## 8. Base de datos Supabase (schema público)

Tablas principales:

| Tabla | Uso |
|-------|-----|
| `perfiles` | `id` = UUID de Auth, `rol` = `admin` \| `inquilino` |
| `propietarios` | dueños de propiedades |
| `propiedades` | `propietario_id`, dirección, tipo, estado |
| `inquilinos` | datos del inquilino, `perfil_id` opcional |
| `contratos` | alquiler; `activo` boolean; ajustes ICL/IPC/manual |
| `reclamos` | tickets de mantenimiento |
| `documentos` | archivos (tabla existe; front inquilino aún mock) |
| `indices` | valores ICL/IPC para aumentos |
| `aumentos` | historial de aumentos aplicados |

### Tabla `reclamos` (detalle)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | bigint | PK |
| `propiedad_id` | bigint | FK |
| `inquilino_id` | bigint | FK |
| `titulo` | text | |
| `descripcion` | text | |
| `estado` | enum `reclamo_estado` | `Pendiente`, `En Proceso`, `Resuelto` |
| `prioridad` | enum `reclamo_prioridad` | `Baja`, `Media`, `Alta`, `Urgente` (default `Media`) |
| `categoria` | enum `reclamo_categoria` | nullable; aún no en UI |
| `fecha_creacion` | timestamptz | default `now()` |

### Contratos

- **Crear:** `contratosService.crearContrato`
- **Finalizar:** `finalizarContrato` → `activo = false` (no hay delete desde UI)
- **Tipo ajuste:** enum `tipo_ajuste_contrato` — `manual`, `porcentaje_fijo`, `icl`, `ipc`, etc.

### Aumentos (módulo avanzado)

- RPCs: `calcular_aumentos_pendientes`, `confirmar_aumentos`
- Edge Function: `sync-argly-icl` para sincronizar índice ICL
- Migraciones en `supabase/migrations/20250605_*` … `20250607_*`

---

## 9. Reglas de negocio importantes

> **Importante:** muchas validaciones están solo en el **frontend**. La DB puede no tenerlas aún. Ver `.cursor/rules/validaciones-y-supabase.mdc`.

### Reclamos

- **Alta:** solo inquilinos con **contrato activo** (`activo = true`).
  - Filtro: `src/utils/contratoActivo.js` → `inquilinosConContratoActivo`
  - UI: `ReclamoFormModal.jsx` — propiedad se autocompleta del contrato activo
- **Estado inicial:** siempre `Pendiente` al crear
- **Edición:** no se cambian `inquilino_id` ni `propiedad_id`; sí título, descripción, prioridad, estado
- **Eliminación:** permitida; aviso extra si `estado === 'Resuelto'`

### Propiedades / inquilinos — borrado

- No se puede borrar si tienen **contratos activos** (trigger en DB si corrió `20250603_reglas_borrado.sql` + validación en front)
- Al borrar propiedad: CASCADE de reclamos, documentos, contratos inactivos

### Contratos

- Un inquilino puede tener varios contratos activos (ej. dos propiedades); el modal de reclamo toma el **primero** que encuentra `.find()` — posible mejora futura: elegir propiedad.

---

## 10. Estado de integración Supabase

### Conectado (datos reales)

- Auth + roles (`perfiles`)
- CRUD admin: propietarios, propiedades, inquilinos, contratos, reclamos
- Módulo aumentos + índices ICL/IPC
- Sign out en layouts

### Aún con `mockData.js`

- `AdminDashboard` — KPIs y gráfico de ocupación
- `InquilinoDashboard` — resumen de alquiler
- `InquilinoReclamos` — lista y formulario simulado
- `InquilinoDocumentos` — lista y descarga simulada

### Pendiente / gaps

- Validaciones de reclamos y contratos en DB (triggers/RLS)
- Portal inquilino conectado a Supabase
- Módulo documentos + Storage
- Schema inicial versionado en repo (solo hay migraciones incrementales)
- Campo `categoria` en reclamos (existe en DB, no en UI)
- Dashboard admin con agregaciones reales

---

## 11. Migraciones y seeds

Las migraciones en `supabase/migrations/` se ejecutan **manualmente** en Supabase → SQL Editor (no hay `config.toml` / `supabase start` en el repo).

| Archivo | Contenido |
|---------|-----------|
| `20250603_reglas_borrado.sql` | Triggers delete propiedad/inquilino; CASCADE |
| `20250605_modulo_aumentos_up.sql` | Tablas `indices`, `aumentos`, RLS, RPC confirmar |
| `20250606_calcular_aumentos_pendientes_up.sql` | RPC calcular pendientes |
| `20250606_upsert_indices_icl_batch_up.sql` | batch ICL |
| `20250607_ipc_aumentos_up.sql` | soporte IPC |

Seeds demo: `supabase/seeds/demo_contrato_icl_aumentos.sql`, `demo_contrato_ipc_aumentos.sql`.

---

## 12. Patrones de código a respetar

1. **Idioma UI:** español (Argentina) — mensajes, labels, placeholders.
2. **Estilos:** Tailwind utility classes; Tremor para badges, cards, charts en admin.
3. **Errores Supabase:** mostrar `error.message` en cards rojas o dentro del modal.
4. **IDs:** a veces se comparan como `String(id)` por joins de Supabase.
5. **No sobre-ingenierizar:** seguir el patrón hook + service existente; cambios mínimos.
6. **Commits:** solo si el usuario lo pide explícitamente.

---

## 13. Cómo extender un módulo (checklist)

Para agregar un campo o feature en un módulo existente (ej. reclamos):

1. Verificar columna en Supabase (o crear migración).
2. Actualizar `*Service.js` — `select`, `insert`, `update`.
3. Actualizar `use*.js` — pasar el campo en `crear` / `actualizar`.
4. Actualizar `*FormModal.jsx` — input/select.
5. Actualizar página lista — columna en tabla si aplica.
6. Si hay regla de negocio → `utils/` o validación en modal.
7. Opcional: replicar validación en migración SQL.

---

## 14. Deploy

- **Frontend:** Vercel (`vercel.json` → SPA fallback a `index.html`)
- **Variables en Vercel:** mismas que `.env.example`
- **Supabase Auth:** configurar Site URL con dominio de Vercel

---

## 15. Glosario rápido

| Término | Significado en Inmobi |
|---------|------------------------|
| Contrato activo | `contratos.activo = true` |
| Finalizar contrato | `activo = false`, no borrar fila |
| Vinculado | inquilino con `perfil_id` asignado |
| Reclamo elegible | inquilino con al menos un contrato activo |

---

*Última actualización: refleja el estado del repo con módulo reclamos incluyendo prioridad, portal inquilino parcialmente mock, y Supabase como backend principal del admin.*
