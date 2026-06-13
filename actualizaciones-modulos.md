# Actualizaciones de módulos — Inmobi

Este documento describe las mejoras implementadas en los módulos **Propietarios**, **Propiedades** y el **Portal del Inquilino**. Está redactado en el mismo formato funcional que `documento.md`, para facilitar su incorporación a la documentación de la tesis.

---

## Propietarios

El módulo mantiene su alcance original (registrar, consultar, modificar y eliminar propietarios con nombre completo, DNI/CUIT, teléfono y correo electrónico), pero incorpora validaciones de negocio y controles de integridad en frontend y capa de servicios.

### Validaciones al crear y editar

Al dar de alta o modificar un propietario, el sistema valida en el formulario:

    Nombre completo: obligatorio, mínimo 3 caracteres y máximo 100.

    DNI/CUIT: obligatorio; acepta DNI (7 u 8 dígitos) o CUIT/CUIL (11 dígitos), con o sin guiones o puntos.

    Teléfono: obligatorio; solo dígitos (se permiten espacios, guiones o paréntesis al ingresar), entre 8 y 15 dígitos.

    Email: obligatorio; formato válido de correo electrónico.

Los errores se muestran debajo de cada campo antes de enviar el formulario. En la capa de servicios, los datos se sanitizan (recorte de espacios y normalización del email a minúsculas) antes de persistirse en la base de datos.

### Unicidad de DNI/CUIT

El sistema impide registrar dos propietarios con el mismo DNI/CUIT. Al crear o editar, se consulta la base de datos y, si ya existe otro registro con ese documento, se rechaza la operación con un mensaje claro. En edición, el registro actual queda excluido de esa verificación.

### Eliminación

La eliminación de un propietario sigue permitida únicamente cuando no tiene propiedades asociadas. Antes de borrar, el sistema cuenta las propiedades vinculadas y bloquea la operación si el contador es mayor a cero.

La confirmación de baja dejó de usar el diálogo nativo del navegador (`window.confirm`) y pasó a un modal de confirmación consistente con el resto del panel administrador, con estado de carga mientras se ejecuta la eliminación.

---

## Propiedades

El módulo conserva el CRUD sobre propietario vinculado, dirección, tipo y estado operativo, con reglas reforzadas de integridad respecto de contratos, reclamos y propietarios.

### Validaciones al crear y editar

    Propietario: obligatorio en alta y en edición. Se eliminó la opción "Ninguno" del formulario de edición; toda propiedad debe tener un propietario asignado.

    Dirección: obligatoria, mínimo 5 caracteres y máximo 200.

    Tipo: solo valores permitidos — Departamento, Casa, Local comercial.

    Estado: solo valores permitidos — Disponible, Alquilada, Mantenimiento.

En la capa de servicios se validan los enums y se rechazan valores fuera de catálogo antes de llegar a la base de datos.

### Contrato activo y edición de estado

Si la propiedad tiene al menos un contrato activo, el campo **Estado** queda bloqueado en el formulario de edición. El inquilino/administrador no puede cambiar manualmente el estado a Disponible o Mantenimiento mientras exista un contrato vigente; el sistema muestra un aviso informativo en el modal.

### Cambio de propietario con contrato activo

Si la propiedad tiene contrato activo y el administrador modifica el propietario asignado, el sistema no bloquea el cambio pero solicita confirmación explícita mediante un modal, advirtiendo que la propiedad tiene un contrato en curso.

### Eliminación

La eliminación sigue bloqueada cuando hay **contratos activos**. Además, al intentar borrar una propiedad sin contratos activos pero con historial asociado, el sistema advierte con detalle antes de confirmar:

    Cantidad de contratos históricos (finalizados).

    Cantidad de reclamos asociados.

Si el usuario confirma, se procede con la baja; los reclamos vinculados se eliminan en cascada según el comportamiento definido en la base de datos. El mensaje de confirmación detalla explícitamente qué historial se perderá.

La función de conteo de dependencias distingue ahora entre `contratos_activos`, `contratos_historicos` y `reclamos`, en lugar de un único contador genérico de contratos.

### Alta de propiedad

Para crear una propiedad sigue siendo necesario contar con al menos un propietario registrado. Si no hay propietarios, el formulario de alta permanece deshabilitado y se informa al administrador.

---

## Portal del Inquilino

Se implementó el ingreso y la experiencia del rol **Inquilino**, accesible tras autenticarse con credenciales vinculadas a un perfil con `rol = inquilino`. El portal utiliza un diseño mobile-first con navegación inferior y tarjetas de acceso rápido, alineado con la propuesta de interfaz del proyecto.

El sistema identifica al inquilino mediante la relación entre el usuario autenticado (`perfiles.id`) y el registro en la tabla `inquilinos` (`perfil_id`). Si no existe esa vinculación, se muestra un mensaje orientando a contactar a la inmobiliaria.

### Estructura de navegación

El portal del inquilino expone tres secciones principales:

    Inicio (`/inquilino/dashboard`): resumen del alquiler y accesos rápidos.

    Reclamos (`/inquilino/reclamos`): gestión de solicitudes de mantenimiento.

    Mi Contrato (`/inquilino/documentos`): consulta de datos del contrato vigente y del perfil del inquilino.

El encabezado muestra el nombre del inquilino y la opción de cerrar sesión. Los datos del portal se cargan una vez al ingresar y se comparten entre las pantallas mediante un contexto de aplicación, evitando consultas redundantes.

---

### Inicio (Dashboard del inquilino)

A través de esta interfaz, el inquilino puede visualizar:

    Saludo personalizado con su nombre.

    Propiedad actual vinculada al contrato activo (dirección y tipo).

    Monto mensual del alquiler.

    Días restantes hasta el vencimiento del contrato (resaltados si quedan 60 días o menos).

    Vigencia del contrato (fecha de inicio y fin).

    Fecha del próximo aumento, cuando esté definida.

    Día de vencimiento mensual del canon, cuando corresponda.

    Acceso rápido a Mis Reclamos, con indicador de reclamos pendientes.

    Acceso rápido a Mi Contrato.

Si el inquilino no posee contratos activos, el sistema informa que no hay alquiler vigente y sugiere contactar a la inmobiliaria.

---

### Reclamos (vista del inquilino)

A través de esta interfaz, el inquilino puede realizar las siguientes acciones:

**Consultar el historial**

Listado de todos sus reclamos, ordenados por fecha de creación (más recientes primero). Cada registro muestra título, descripción, fecha, propiedad vinculada y estado actual (Pendiente, En Proceso, Resuelto).

**Generar nuevas solicitudes**

Mediante un formulario (panel inferior en dispositivos móviles) con los campos:

    Título: encabezado breve del problema (obligatorio, máximo 100 caracteres).

    Descripción: detalle de la falla (obligatorio, máximo 500 caracteres).

El reclamo se asocia automáticamente al inquilino autenticado y a la propiedad de su contrato activo. El estado inicial es siempre **Pendiente**. Si no hay contrato activo, no es posible crear reclamos (el botón de alta queda deshabilitado).

**Modificar o eliminar reclamos propios**

El inquilino puede editar o borrar únicamente los reclamos en estado **Pendiente**. Una vez que el administrador cambia el estado a **En Proceso** o **Resuelto**, el registro pasa a solo lectura para el inquilino.

Las operaciones de edición y eliminación validan en la capa de servicios que el reclamo pertenezca al inquilino y conserve el estado Pendiente; de lo contrario, la base de datos rechaza la operación y el sistema muestra un mensaje claro.

**Confirmación de eliminación**

La baja de un reclamo pendiente requiere confirmación mediante modal, con indicador de carga durante la operación.

---

### Mi Contrato (documentación y datos)

A través de esta interfaz, el inquilino puede consultar la información de su contrato vigente:

    Dirección y tipo de la propiedad.

    Fechas de inicio y vencimiento.

    Monto mensual actual y monto inicial.

    Tipo de ajuste (ICL, IPC, porcentaje fijo, manual).

    Periodicidad del ajuste.

    Fecha del próximo aumento.

    Día de vencimiento mensual.

    Observaciones del contrato, si existen.

Además, el inquilino puede visualizar sus datos personales registrados:

    Nombre completo.

    DNI/CUIT.

    Teléfono.

**Documentación adjunta (alcance parcial)**

La consulta y descarga de archivos adjuntos (contrato firmado, DNI, recibos de sueldo, documentación del garante) queda preparada como sección en la interfaz, con mensaje de habilitación futura. La visualización de metadatos del contrato y del perfil del inquilino ya está operativa con datos reales de la base de datos.

---

## Validaciones compartidas

Se incorporó un módulo de utilidades de validación reutilizable (`validaciones.js`) con funciones comunes para formularios de propietarios y propiedades:

    Constantes de tipos y estados de propiedad.

    Validación de dirección, nombre completo, DNI/CUIT, teléfono y email.

Estas reglas se aplican en el frontend; los servicios complementan con sanitización y validaciones de negocio antes de persistir.

---

## Resumen de reglas de negocio implementadas

| Módulo | Regla | Comportamiento |
|--------|-------|----------------|
| Propietarios | DNI/CUIT único | Rechaza alta/edición si el documento ya existe |
| Propietarios | Eliminar con propiedades | Bloqueado; mensaje informativo |
| Propiedades | Propietario obligatorio | Sin opción "sin propietario" |
| Propiedades | Estado con contrato activo | Campo bloqueado en edición |
| Propiedades | Cambio de propietario con contrato activo | Advertencia y confirmación |
| Propiedades | Eliminar con contrato activo | Bloqueado |
| Propiedades | Eliminar con historial | Advertencia con conteo de contratos históricos y reclamos |
| Inquilino | Acceso al portal | Requiere `perfil_id` vinculado en `inquilinos` |
| Inquilino | Crear reclamo | Requiere contrato activo; estado inicial Pendiente |
| Inquilino | Editar/eliminar reclamo | Solo en estado Pendiente y solo los propios |

---

## Referencia técnica (integración en la tesis)

Archivos principales afectados o creados:

**Administrador — Propietarios y Propiedades**

    `src/utils/validaciones.js`

    `src/services/propietariosService.js`

    `src/services/propiedadesService.js`

    `src/components/admin/forms/PropietarioFormModal.jsx`

    `src/components/admin/forms/PropiedadFormModal.jsx`

    `src/pages/admin/AdminPropietarios.jsx`

    `src/pages/admin/AdminPropiedades.jsx`

**Portal del Inquilino**

    `src/services/portalInquilinoService.js`

    `src/contexts/PortalInquilinoContext.jsx`

    `src/layouts/InquilinoLayout.jsx`

    `src/pages/inquilino/InquilinoDashboard.jsx`

    `src/pages/inquilino/InquilinoReclamos.jsx`

    `src/pages/inquilino/InquilinoDocumentos.jsx`

Rutas del portal (ya registradas en el enrutador):

    `/inquilino/dashboard`

    `/inquilino/reclamos`

    `/inquilino/documentos`

---

## Sugerencia de incorporación en `documento.md`

Para integrar este contenido en el documento principal de la tesis:

1. **Sección Alcance — Propietarios y Propiedades:** reemplazar o ampliar los párrafos existentes con las subsecciones de validaciones, unicidad, contrato activo y eliminación con historial de este archivo.

2. **Sección Alcance — Portal del Inquilino:** agregar una nueva subsección después de Documentación (o dentro de Reclamos/Documentación) con las descripciones de Inicio, Reclamos y Mi Contrato.

3. **Requerimientos funcionales:** derivar IDs nuevos (por ejemplo, RF-P07, RF-PR01, RF-IQ01) a partir de la tabla de reglas de negocio y del detalle funcional de cada pantalla.

4. **Pendientes documentados:** dejar explícito que la descarga de archivos adjuntos en Mi Contrato queda fuera del alcance implementado en esta iteración.
