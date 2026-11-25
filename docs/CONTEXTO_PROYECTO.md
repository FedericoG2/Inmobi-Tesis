# Inmobi — Contexto del proyecto

Referencia para quien se suma al proyecto (personas o asistentes): cómo está organizado el repo, qué hace cada capa y dónde viven las reglas de negocio. El alcance funcional completo está en el informe de la tesis.

---

## 1. Qué es Inmobi

Sistema web de gestión inmobiliaria para Zitelli & Asociados S.R.L. Centraliza propiedades, propietarios, inquilinos, contratos, el cobro de los alquileres (períodos y comprobantes de pago) y reclamos, y automatiza los aumentos de alquiler por IPC (INDEC) o ICL (BCRA), con índices consultados a la API Argly.

| Rol (`perfiles.rol`) | Quién es | Ruta base |
|---|---|---|
| `admin` | Administrador de sistema: solo administra cuentas | `/cuentas` |
| `encargado` | Encargado de Alquileres: opera toda la cartera | `/admin/*` |
| `inquilino` | Inquilino: portal con sus propios datos; registra comprobantes de pago y reclamos | `/inquilino/*` |
| `propietario` | Propietario: portal de consulta de sus propiedades, alquileres, pagos y documentos | `/propietario/*` |

**Stack:** React 18 + Vite + React Router v6 + Tailwind CSS 4 (sistema de diseño propio) + Tremor v3 (tablas) + Motion (login) + Supabase (`@supabase/supabase-js`, con Realtime) + jsPDF.

---

## 2. Arranque local

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

La anon key es pública. La service role nunca va en variables `VITE_` ni en el navegador: solo la usan las Edge Functions y `scripts/create-admin-user.mjs`.

---

## 3. Arquitectura en capas

```
Página (pages/*)  →  Hook (hooks/use*.js)  →  Service (services/*Service.js)  →  supabaseClient.js
                                    ↘ utils/ (reglas sin interfaz: cálculo de aumentos, validaciones, PDF)
```

- **Services:** funciones async (`listarX`, `crearX`, `actualizarX`, `eliminarX`) que devuelven `{ data, error }`.
- **Hooks:** estado, carga y acciones de cada módulo.
- **Utils:** lógica pura; por ejemplo `calcularAumento.js` (fórmulas ICL/IPC) y `aumentosUi.js` (bandeja del 11 al 10, rezagados, textos).

---

## 4. Autenticación y roles

1. `LoginPage` → `supabase.auth.signInWithPassword`.
2. `AuthContext` lee el rol de `public.perfiles` y calcula la ruta de inicio.
3. `ProtectedRoute` exige sesión; `RolRoute` (`CuentasRoute`, `EncargadoRoute`, `InquilinoRoute`, `PropietarioRoute`) deja pasar solo al rol indicado.
4. Sin perfil o rol: pantalla "Cuenta sin rol asignado". Cuenta bloqueada: no inicia sesión.

Las cuentas se administran con la Edge Function `gestionar-cuentas` (alta, rol, bloqueo y contraseña). Las cuentas de inquilino y de propietario se vinculan con su ficha (`perfil_id`), que el Encargado carga antes. La función verifica que quien llama sea `admin` y usa la service role del lado del servidor. Una cuenta solo recibe rol si se lo asigna el Administrador (`handle_new_user` no asigna uno por defecto). El registro público de Supabase Auth debe estar desactivado.

---

## 5. Rutas

| Ruta | Página |
|---|---|
| `/login` | `pages/auth/LoginPage.jsx` (inicio de sesión y pedido del enlace de recuperación) |
| `/restablecer-contrasena` | `pages/auth/RestablecerPasswordPage.jsx` (contraseña nueva; solo con el enlace del email) |
| `/cuentas` | `pages/cuentas/AdminCuentas.jsx` |
| `/admin/dashboard` | `AdminDashboard.jsx` (indicadores, listas de atención, IPC del año) |
| `/admin/propietarios` · `propiedades` · `inquilinos` · `contratos` · `alquileres` · `aumentos` · `reclamos` | una página por módulo en `pages/admin/` |
| `/inquilino/dashboard` · `contrato` · `pagos` · `reclamos` · `perfil` | `pages/inquilino/` |
| `/propietario/inicio` · `propiedades` · `alquileres` · `perfil` | `pages/propietario/` |

Los dos portales comparten el menú, el encabezado y el selector de contrato de `components/portal/`. Los componentes de pagos (`components/alquileres/`) los usan el Encargado y los dos portales; cada pantalla agrega las acciones de su rol.

---

## 6. Base de datos (schema `public`)

| Tabla | Uso |
|---|---|
| `perfiles` | `id` = usuario de Auth, `rol` (`admin`, `encargado`, `inquilino`, `propietario`) |
| `propietarios` | personas físicas o jurídicas; DNI/CUIT único; `perfil_id` vincula la cuenta del portal |
| `propiedades` | ubicación normalizada y única, tipo, estado (`Disponible`, `Reservada`, `Alquilada`, `Mantenimiento`) |
| `inquilinos` | ficha; `perfil_id` vincula la cuenta del portal (una por ficha) |
| `contratos` | `estado` (`programado`, `activo`, `inactivo` = cerrado); al cerrarlo, `motivo_cierre` (`Finalizado`, `Rescindido` o `Cancelado`), `observaciones_cierre` y `cerrado_en`; monto, periodicidad, tipo de ajuste, próximo y último aumento |
| `aumentos` | aumentos confirmados con copia del cálculo (`detalle_calculo`) |
| `periodos_alquiler` | un renglón por mes de cada contrato, desde el inicio hasta el mes en curso: monto, vencimiento y estado (`Pendiente` o `Pagado`) |
| `comprobantes_pago` | comprobantes de un período (archivo en el bucket privado `comprobantes-pago`); no se modifican ni se eliminan |
| `indices_manuales` | IPC (variación % de un mes) o ICL (valor de una fecha) cargados a mano cuando Argly no los publica; el oficial siempre gana |
| `revisiones_aumento` | marca de revisado, observaciones y redondeo de un aumento pendiente, hasta confirmarlo |
| `auditoria` | alta, modificación y baja de contratos, períodos, aumentos, comprobantes y reclamos: usuario, fecha y valores anteriores y nuevos (`valor_anterior`, `valor_nuevo`). No se borra |
| `reclamos` / `reclamo_eventos` | reclamos y su línea de tiempo (estado anterior, nuevo, comentario y autor) |
| `documentos` | contrato firmado, comprobantes de aumento e imágenes de reclamos (bucket privado `contratos`) |
| `actividad` | registro de lo que pasa en el sistema (contratos, aumentos, reclamos, cartera y documentos), cargado por triggers; alimenta "Actividad reciente" y la campana |

Los índices no se guardan en una tabla: se consultan en vivo a Argly (desde el navegador o, si falla, con la Edge Function `obtener-indices-argly`, que solo atiende al Encargado).

**Funciones RPC:** `confirmar_aumentos`, `deshacer_aumento`, `gestionar_reclamo`, `confirmar_pago_periodo`, `deshacer_pago_periodo` y `auditoria_contrato` (exigen rol `encargado`); `generar_periodos_alquiler` (cada rol genera solo los de los contratos que ve), `portal_propietario_inquilinos`, `activar_contratos_programados` y `sincronizar_estado_propiedad_por_contratos`.

**Tarea diaria (pg_cron):** `generar-periodos-alquiler` activa los contratos programados que empiezan y crea los períodos del mes. Las pantallas también generan los períodos al abrirse.

**RLS:** el Encargado opera la cartera. El inquilino ve solo sus contratos (activos y finalizados, no programados), sus aumentos, sus pagos, sus documentos compartidos y sus reclamos. El propietario ve solo sus propiedades y los contratos, aumentos, pagos y documentos de ellas; del inquilino, solo el nombre. El Administrador de sistema no lee la cartera.

---

## 7. Reglas de negocio principales (validadas en la base)

- **Propiedades:** no se crean `Alquilada`; `Alquilada` y `Reservada` las asigna el contrato. No se borran si tienen contratos o reclamos.
- **Propiedades (cambios):** con contratos o reclamos no cambian el tipo ni la dirección.
- **Contratos:** solo sobre propiedades `Disponible` y sin fechas superpuestas. Si empiezan después de hoy quedan `programado`. No se editan una vez cargados. Se eliminan solo finalizados o programados, sin aumentos, períodos de alquiler, comprobantes ni reclamos del mismo inquilino en esa propiedad; al eliminarlos se borran sus documentos y archivos.
- **Cierre de contratos:** un activo se finaliza (fin del contrato) o se rescinde (rescisión anticipada), con observaciones; un programado se cancela. El cierre no se edita.
- **Alquileres:** cada contrato activo tiene un período por mes (el Encargado puede generar un mes posterior al elegirlo en Alquileres). No se confirma el pago de un período si a ese mes le corresponde un aumento sin confirmar (RF-057). Solo se registran comprobantes en períodos `Pendiente` (el inquilino, además, solo en sus contratos activos). Registrar un comprobante no paga el período: lo pasa a `Pagado` el Encargado con `confirmar_pago_periodo`, y solo si tiene al menos un comprobante. Deshacer la confirmación lo devuelve a `Pendiente`. Cada paso queda en `actividad`.
- **Aumentos:** entran a la bandeja el día 11 del mes del aumento y se confirman hasta el día 10 del mes siguiente; después quedan rezagados. Se confirman una sola vez, con monto mayor que cero y contrato activo. Se puede confirmar un aumento Pendiente o Revisado; la revisión (marca, observaciones y redondeo) queda guardada. Los índices que faltan se cargan en "Carga manual de índices" y sirven para todos los aumentos que los usan. Al confirmar, los períodos pendientes desde ese mes toman el monto nuevo. Se pueden deshacer hasta el día 10 del mes siguiente, solo el más reciente y solo si el período de ese mes no está pagado; al deshacer se borra el comprobante y los períodos pendientes vuelven al monto anterior.
- **Reclamos:** nacen `Pendiente`, solo con contrato activo del inquilino en esa propiedad. El estado cambia solo por `gestionar_reclamo` y no vuelve a `Pendiente`; reabrir un `Resuelto` lo deja `En Proceso`. Un `Resuelto` no se edita, no recibe imágenes ni se elimina. Hasta 5 imágenes.
- **Inquilinos:** DNI/CUIT único; si tiene o tuvo un contrato activo no cambia el tipo de persona ni el documento; no se borra con contratos o reclamos.
- **Propietarios:** con propiedades no cambian el tipo de persona ni el documento, y no se borran.

---

## 8. Migraciones y seeds

Las migraciones de `supabase/migrations/` se aplican en orden en Supabase → SQL Editor. Los archivos `_down.sql` revierten la migración del mismo nombre.

Seeds de demostración en `supabase/seeds/`: `demo_01_presentacion.sql` (cartera completa con pagos y fechas relativas al día en que se corre; vincula `inquilino.demo@inmobi.com` y `propietario.demo@inmobi.com` si existen; se puede volver a correr) y `demo_00_limpiar.sql` (opcional: **borra todos los datos de negocio**). El paso a paso de la demo está en [`GUION_DEMO.md`](GUION_DEMO.md).

---

## 9. Pruebas

`npm test` corre las pruebas de `tests/`:

- `tests/unit/`: lógica sin interfaz (cálculo de aumentos, plazos, estados de pago, portal, validaciones).
- `tests/db/`: arma un Postgres embebido (PGlite) con las tablas del DER (`esquema_base.sql`) y el SQL real de `supabase/migrations/`, y prueba cada regla de negocio de la base, con la referencia a su RF. `fijarHoy()` fija la fecha para probar los plazos y `comoUsuario()` ejecuta con RLS como un usuario dado. `escenarios.js` arma la base con una cuenta de cada rol y crea los datos de cada prueba. También se prueban las políticas de Storage (con un `storage` mínimo en `esquema_base.sql`).

Si se agrega o cambia una regla en una migración, sumar la prueba en `tests/db/reglas.test.js`, `tests/db/alquileres.test.js` o `tests/db/alineacion.test.js`.

---

## 10. Patrones a respetar

1. Interfaz en español rioplatense, en formato oración.
2. **Sistema de diseño:** no inventar clases sueltas para superficies, controles o colores.
   - `src/utils/ui.js`: tokens (tarjetas, tipografía, inputs, botones, badges, avisos). Colores `brand` + `slate`; `emerald` = ok, `amber` = atención, `red` = problema.
   - `src/components/ui/`: `Button`, `IconButton`, `Badge`, `Modal` (`ModalHeader` / `ModalBody` / `ModalFooter`), `DetailField`.
   - `src/components/icons/Icons.jsx`: set único de íconos (sin SVG locales ni emojis).
3. **El sistema muestra lo que pasa:** cada acción exitosa avisa con `useToast()` qué pasó y en qué estado quedó (ej. "Contrato creado · la propiedad pasó a Alquilada"). Los eventos de negocio quedan en `public.actividad` por triggers y se ven en vivo en el Dashboard y en la campana.
4. Reglas de negocio en la base cuando importan; en la pantalla, el mismo mensaje.
5. Fechas como texto ISO (`YYYY-MM-DD`) y fecha de Argentina (`fecha_hoy_ar()` en la base).
6. Commits solo cuando el equipo lo pide.
