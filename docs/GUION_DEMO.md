# Guion de demo — Inmobi

Recorrido de ~16 minutos pensado para mostrar que **el sistema refleja en todo momento qué pasó y en qué estado quedaron las cosas**: cada acción confirma su resultado, el dashboard del Encargado de Alquileres registra la actividad en vivo, el portal del inquilino se actualiza solo y el propietario consulta sus alquileres y pagos.

---

## 1. Preparación (una sola vez, antes de presentar)

En Supabase → **SQL Editor**, en este orden:

1. **Migraciones al día**: todas las de `supabase/migrations/` en orden de nombre, incluidas la del registro de actividad (`20261008_actividad_sistema.sql`), la de correcciones (`20261029_correcciones_entrega.sql`) y las del módulo de Alquileres y el portal del propietario (`20261117000000_rol_propietario.sql` y después `20261117000100_alquileres_y_portal_propietario.sql`) y la de alineación con el documento (`20261120000000_alineacion_documento.sql`). Si la base ya tenía la de correcciones, la de actividad se puede aplicar después sin problema.
2. **(Opcional) Base limpia:** ejecutar `supabase/seeds/demo_00_limpiar.sql`.
   ⚠️ Borra **todos** los propietarios, propiedades, inquilinos, contratos, pagos, aumentos y reclamos. No toca los usuarios.
3. **Usuarios de los portales:** en **Authentication → Users → Add user**, crear `inquilino.demo@inmobi.com` y `propietario.demo@inmobi.com` con una contraseña (marcar *Auto Confirm User*).
4. **Datos de demo:** ejecutar `supabase/seeds/demo_01_presentacion.sql`. Al final aparecen en *Messages*:
   `Portal habilitado: inquilino.demo@inmobi.com → Mariana Belén López`, `Portal habilitado: propietario.demo@inmobi.com → Silvia Beatriz Molina` y el mes de aumentos trabajado.

> El seed usa fechas relativas al día en que se ejecuta y respeta la bandeja de aumentos (del día 11 del mes al día 10 del siguiente). **Conviene correrlo el mismo día de la presentación** para que los pendientes, el rezagado y el contrato por vencer caigan donde corresponde. Se puede volver a correr: primero borra la demo anterior.

**Qué queda cargado**

| Escenario | Dónde se ve |
|---|---|
| 3 aumentos **pendientes** del mes trabajado (Mariana López IPC, Carlos Gómez ICL, Estudio Contable ICL) | Aumentos → Pendientes |
| 1 aumento **rezagado** del mes anterior (Lucía Fernández) | Aumentos → Rezagados |
| 1 aumento **confirmado** del mes, que todavía se puede deshacer (Agustín Torres) | Aumentos → Confirmados · Historial |
| 1 contrato **por vencer** en ~45 días (Natalia Ruiz) | Dashboard → Contratos por vencer (60 días) |
| 1 contrato **programado** para el mes próximo (Valentina Sosa) → propiedad **Reservada** | Contratos → Programados · Propiedades |
| 1 contrato **finalizado** (Javier Méndez) → su local volvió a **Disponible** | Contratos → Finalizados |
| 7 reclamos en todos los estados, con historial | Reclamos · Dashboard |
| **Pagos:** los meses anteriores cobrados; del mes en curso ya pagaron Diego Herrera y Natalia Ruiz; Lucía Fernández debe además el mes pasado | Alquileres · portales |
| Silvia Molina (propietaria del portal) es dueña del departamento de Mariana y del de Natalia | Portal del propietario |
| Propiedades disponibles para la demo: **Independencia 1020, 6º B** y **9 de Julio 640, Local 1** | Propiedades |

**Pantallas:** abrir el panel con una cuenta de **Encargado de Alquileres** en una ventana y el portal del inquilino (`inquilino.demo@inmobi.com`) en una **ventana de incógnito** al lado. Así se ve cómo una acción en un lado aparece al instante en el otro. Para la escena del propietario, cerrar sesión en la ventana de incógnito y entrar con `propietario.demo@inmobi.com`.

---

## 2. Recorrido

### Escena 1 — El tablero muestra el estado actual (1 min)
- **Dashboard del encargado.** Indicadores, reclamos pendientes, contratos por vencer.
- Panel **Actividad reciente · En vivo**: el historial de todo lo que pasó (contratos creados, aumentos confirmados, reclamos resueltos), con fecha relativa.
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
2. Si Argly no publicó algún mes, cargarlo en **Carga manual de índices** (IPC por mes o ICL por fecha) → los aumentos que lo usan se recalculan solos. El oficial siempre tiene prioridad.
3. Abrir el detalle de **Mariana López**: índices, fórmula y monto ajustado. Escribir una observación y marcar **Cálculo revisado**: en la bandeja pasa a *Revisado* y queda guardado aunque se recargue la página. → **Confirmar aumento**.
   > ✓ **Aumento confirmado** — Mariana Belén López: el alquiler pasa a $ … desde el …. Se generó el comprobante y se puede deshacer hasta el ….
4. **En la ventana del inquilino**, sin recargar: el monto nuevo ya figura en *Tu contrato* y en el inicio, y el comprobante PDF aparece en la documentación.
5. En *Confirmados*, mostrar el de Agustín Torres y **deshacerlo**: aviso "Aumento deshecho · el contrato volvió a $ …".
6. Mostrar el **rezagado** (Lucía) como lo urgente del módulo.

### Escena 4 — Reclamo de punta a punta (3 min)
1. **Inquilino:** Reclamos → **Nuevo reclamo** (Plomería, Urgente) → *Enviar*.
   > ✓ **Reclamo enviado** — La inmobiliaria ya lo recibió.
2. **Encargado**, sin recargar: aviso **"Nuevo reclamo del inquilino"**, campana con contador y el reclamo arriba de *Actividad reciente*.
3. Reclamos → **Gestionar** → estado *En Proceso* + comentario ("El plomero pasa mañana a las 10").
   > ✓ **Reclamo en estado En Proceso** — El cambio quedó registrado en el historial y lo ve el inquilino.
4. **Inquilino**, en vivo: la tarjeta del reclamo pasa sola a *En Proceso*; en *Ver detalle* aparece el comentario en el historial.
5. Gestionar → **Resuelto** → mostrar la línea de tiempo completa en el detalle del reclamo.

### Escena 5 — Pago del alquiler (3 min)
> Hacerla después de la Escena 3: el pago del mes del aumento de Mariana no se puede confirmar hasta confirmar ese aumento (RF-057).

1. **Inquilino:** Pagos. Cada mes es un período con su estado; el del mes en curso está pendiente.
2. **Registrar comprobante** en ese período: elegir un PDF o una foto, monto y fecha → *Registrar comprobante*.
   > ✓ **Comprobante enviado** — La inmobiliaria va a revisar el pago y confirmarlo.
   El período queda **Comprobante en revisión**: registrar el comprobante **no** paga el período.
3. **Encargado**, sin recargar: la campana avisa "Comprobante de pago registrado". Alquileres muestra los alquileres del mes (se puede elegir otro mes y filtrar por estado) → tarjeta **Comprobantes por revisar** → **Ver** en el de Mariana.
4. Abrir el comprobante (**Ver**) y **Confirmar pago**.
   > ✓ **Pago confirmado** — el período quedó Pagado.
   Un período sin comprobante no se puede confirmar, ni uno cuyo aumento del mes falta confirmar: el botón queda deshabilitado y se ve "Falta confirmar el aumento de …".
5. **Inquilino**, en vivo: el período pasa a **Pagado** y el comprobante a *Pago confirmado*.
6. Mencionar **Deshacer**: vuelve el período a Pendiente y conserva los comprobantes. Un aumento no se puede deshacer si el período de su mes ya está pagado.

### Escena 6 — Portal del propietario (1 min)
- Entrar con `propietario.demo@inmobi.com`. **Inicio:** propiedades, ingreso mensual y el estado del pago del mes de cada alquiler (el de Mariana ya figura Pagado).
- **Propiedades:** estado de cada una y el contrato vigente.
- **Alquileres:** pagos con sus comprobantes, condiciones, historial de montos y aumentos y documentos. Todo en modo consulta: el propietario no registra ni confirma pagos.

### Escena 7 — Ciclo de vida del contrato (2 min)
- **Finalizar o rescindir:** en un contrato activo, elegir *Rescisión anticipada* y escribir una observación → aviso "Contrato rescindido". En la pestaña **Cerrados** figura como Rescindido.
- **Ver ficha** del contrato: sección *Cierre del contrato* y **Historial de cambios** (tabla `auditoria`): quién cambió cada dato, cuándo y qué valor había antes.
- Contratos → pestañas **Vencidos / Programados / Finalizados** y la columna **Estado**.
- **Finalizar** un contrato → aviso "Contrato finalizado… quedó Disponible" → la propiedad vuelve a Disponible y el evento aparece en la actividad.

### Escena 8 — Portal del inquilino (1 min)
- Inicio: próximo pago y vencimiento. Si el aumento cae en el mes del próximo pago: el aviso de que lo confirma la inmobiliaria, o, ya confirmado, el monto nuevo, el porcentaje y desde cuándo rige (nunca un monto estimado).
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
| Alquileres o Pagos muestran un error, o el propietario ve "No encontramos tu ficha…" | Faltan las migraciones `20261117_*`, o el usuario `propietario.demo@inmobi.com` no existía al correr el seed. |
| "No se pudo registrar el comprobante" | El período ya no está pendiente o el contrato no está activo; o falta el bucket `comprobantes-pago` (lo crea la migración `20261117000100`). |
