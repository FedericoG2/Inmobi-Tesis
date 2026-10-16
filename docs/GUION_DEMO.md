# Guion de demo — Inmobi

Recorrido de ~12 minutos pensado para mostrar que **el sistema refleja en todo momento qué pasó y en qué estado quedaron las cosas**: cada acción confirma su resultado, el dashboard del Encargado de Alquileres registra la actividad en vivo y el portal del inquilino se actualiza solo, sin recargar.

---

## 1. Preparación (una sola vez, antes de presentar)

En Supabase → **SQL Editor**, en este orden:

1. **Migraciones al día**, en orden: las de roles (`20261005_*`), la del registro de actividad (`20261008_actividad_sistema.sql`) y las `20261010_*`.
2. **(Opcional) Base limpia:** ejecutar `supabase/seeds/demo_00_limpiar.sql`.
   ⚠️ Borra **todos** los propietarios, propiedades, inquilinos, contratos, aumentos y reclamos. No toca usuarios ni índices.
3. **Usuario del portal:** en **Authentication → Users → Add user**, crear `inquilino.demo@inmobi.com` con una contraseña (marcar *Auto Confirm User*).
4. **Datos de demo:** ejecutar `supabase/seeds/demo_01_presentacion.sql`. Al final aparece en *Messages*:
   `Portal habilitado: inquilino.demo@inmobi.com → Mariana Belén López` y el mes de aumentos trabajado.

> El seed usa fechas relativas al día en que se ejecuta y respeta la bandeja de aumentos (del día 11 del mes al día 10 del siguiente). **Conviene correrlo el mismo día de la presentación** para que los pendientes, el rezagado y el contrato por vencer caigan donde corresponde. Se puede volver a correr: primero borra la demo anterior.

**Qué queda cargado**

| Escenario | Dónde se ve |
|---|---|
| 3 aumentos **pendientes** del mes trabajado (Mariana López IPC, Carlos Gómez ICL, Estudio Contable ICL) | Aumentos → Pendientes |
| 1 aumento **rezagado** del mes anterior (Lucía Fernández) | Aumentos → Rezagados |
| 1 aumento **confirmado** del mes, que todavía se puede deshacer (Agustín Torres) | Aumentos → Confirmados · Historial |
| 1 contrato **por vencer** en ~45 días (Natalia Ruiz) | Dashboard → Contratos por vencer (60 días) |
| 1 contrato **programado** para el mes próximo (Valentina Sosa) → propiedad **Reservada** | Contratos → Programados · Propiedades |
| 1 contrato **finalizado** (Javier Méndez) → su local volvió a **Disponible** | Contratos → Inactivos |
| 7 reclamos en todos los estados, con historial | Reclamos · Dashboard |
| Propiedades disponibles para la demo: **Independencia 1020, 6º B** y **9 de Julio 640, Local 1** | Propiedades |

**Pantallas:** abrir el panel con una cuenta de **Encargado de Alquileres** en una ventana y el portal del inquilino (`inquilino.demo@inmobi.com`) en una **ventana de incógnito** al lado. Así se ve cómo una acción en un lado aparece al instante en el otro.

---

## 2. Recorrido

### Escena 1 — El tablero muestra el estado actual (1 min)
- **Dashboard del encargado.** Indicadores, reclamos pendientes, contratos por vencer.
- Panel **Actividad reciente · En vivo**: el historial de todo lo que pasó (contratos creados, aumentos aplicados, reclamos resueltos), con fecha relativa.
- Campana del topbar: las mismas novedades, con contador de no leídas.

### Escena 2 — Alta de un contrato (3 min)
1. Contratos → **Nuevo contrato**. Inquilino: **Javier Méndez**. Propiedad: **Independencia 1020, 6º B**.
2. Fechas desde hoy, IPC trimestral. Mostrar el calendario de próximos aumentos y el resumen antes de confirmar.
3. **Confirmar y guardar.** Aparece el aviso:
   > ✓ **Contrato creado** — Javier Méndez · Independencia 1020… El contrato está activo y la propiedad pasó a Alquilada.
4. La fila nueva muestra el estado **Activo**. En Propiedades, la unidad figura **Alquilada**.
5. Volver al Dashboard: en *Actividad reciente* aparecieron **"Contrato creado"** y **"Propiedad Alquilada"**, y los indicadores ya se recalcularon.

> Variante: con fecha de inicio el mes próximo, el aviso dice **"Contrato creado y programado"** y la propiedad queda **Reservada**.

### Escena 3 — Aumento de alquiler (3 min)
1. Aumentos: mes trabajado y bandeja (del 11 al 10 del mes siguiente), contadores (pendientes / rezagados / confirmados).
2. Abrir el detalle de **Mariana López**: índices, fórmula y monto ajustado. Marcar **Cálculo revisado** → **Confirmar aumento**.
   > ✓ **Aumento confirmado** — Mariana Belén López: el alquiler pasa a $ … desde el …. Se generó el comprobante y se puede deshacer hasta el ….
3. **En la ventana del inquilino**, sin recargar: el monto nuevo ya figura en *Tu contrato* y en el inicio.
4. En *Confirmados*, mostrar el de Agustín Torres y **deshacerlo**: aviso "Aumento deshecho · el contrato volvió a $ …".
5. Mostrar el **rezagado** (Lucía) como lo urgente del módulo.

### Escena 4 — Reclamo de punta a punta (3 min)
1. **Inquilino:** Reclamos → **Nuevo reclamo** (Plomería, Urgente) → *Enviar*.
   > ✓ **Reclamo enviado** — La inmobiliaria ya lo recibió.
2. **Encargado**, sin recargar: aviso **"Nuevo reclamo del inquilino"**, campana con contador y el reclamo arriba de *Actividad reciente*.
3. Reclamos → **Gestionar** → estado *En Proceso* + comentario ("El plomero pasa mañana a las 10").
   > ✓ **Reclamo en estado En Proceso** — El cambio quedó registrado en el historial y lo ve el inquilino.
4. **Inquilino**, en vivo: la tarjeta del reclamo pasa sola a *En Proceso*; en *Ver detalle* aparece el comentario en el historial.
5. Gestionar → **Resuelto** → mostrar la línea de tiempo completa en el detalle del reclamo.

### Escena 5 — Ciclo de vida del contrato (1 min)
- Contratos → pestaña **Vencidos / Programados / Inactivos** y la columna **Estado**.
- **Finalizar** un contrato → aviso "Contrato finalizado… quedó Disponible" → la propiedad vuelve a Disponible y el evento aparece en la actividad.

### Escena 6 — Portal del inquilino (1 min)
- Inicio: próximo pago, vencimiento y proyección del próximo aumento.
- Tu contrato: condiciones, historial mes a mes de montos y documentación.
- Reclamos → Ver detalle: imágenes y el historial completo con quién hizo cada cambio.

---

## 3. Qué responder si preguntan "¿cómo sabe el sistema lo que pasó?"

- **Avisos inmediatos:** cada acción confirma su resultado y el **estado en que quedó** (no solo "guardado").
- **Registro de actividad en la base:** triggers en contratos, aumentos, reclamos, propiedades, personas y documentos escriben cada evento en `public.actividad`. No depende del navegador: también quedan registrados los cambios automáticos, como un contrato programado que entra en vigencia.
- **Permisos (RLS):** el Encargado de Alquileres ve toda la actividad; el inquilino, solo la de sus contratos.
- **Tiempo real:** Supabase Realtime empuja cada evento nuevo al dashboard y la campana del encargado, y refresca el portal del inquilino.

## 4. Si algo falla en vivo

| Síntoma | Causa probable |
|---|---|
| El panel dice "Falta instalar el registro de actividad" | No se ejecutó la migración `20261008_actividad_sistema.sql`. |
| El inquilino ve "No encontramos tu perfil…" | El usuario no existía al correr el seed: crearlo y volver a ejecutar `demo_01_presentacion.sql`. |
| No llegan avisos en vivo | Verificar en Database → Publications que `actividad` esté en `supabase_realtime`. |
| Los aumentos no están "pendientes" | El seed se corrió en otra bandeja (antes/después del día 11): volver a ejecutarlo el día de la demo. |
