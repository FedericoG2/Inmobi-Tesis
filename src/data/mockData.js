export const adminKpis = {
  totalPropiedades: 48,
  ocupacion: 87.5,
  contratosActivos: 42,
  reclamosPendientes: 7,
}

export const ocupacionMensual = [
  { mes: 'Ene', ocupacion: 82 },
  { mes: 'Feb', ocupacion: 84 },
  { mes: 'Mar', ocupacion: 85 },
  { mes: 'Abr', ocupacion: 86 },
  { mes: 'May', ocupacion: 87.5 },
]

export const propietarios = [
  { id: 1, nombre: 'María González', dni: '27-30123456-8', telefono: '+54 11 4567-8901', email: 'maria.g@email.com' },
  { id: 2, nombre: 'Carlos Ruiz', dni: '20-28456789-3', telefono: '+54 11 4321-5678', email: 'carlos.ruiz@email.com' },
  { id: 3, nombre: 'Ana Martínez', dni: '27-33567890-1', telefono: '+54 11 4987-6543', email: 'ana.martinez@email.com' },
]

export const propiedades = [
  { id: 1, direccion: 'Av. Corrientes 1234, CABA', tipo: 'Departamento', estado: 'Alquilada' },
  { id: 2, direccion: 'Calle Florida 567, CABA', tipo: 'Local comercial', estado: 'Disponible' },
  { id: 3, direccion: 'San Martín 890, La Plata', tipo: 'Casa', estado: 'Mantenimiento' },
  { id: 4, direccion: 'Rivadavia 2100, CABA', tipo: 'Departamento', estado: 'Alquilada' },
]

export const inquilinosAdmin = [
  { id: 1, dni: '35-40123456-7', nombre: 'Juan Pérez', vinculado: true },
  { id: 2, dni: '33-38234567-8', nombre: 'Laura Sánchez', vinculado: true },
  { id: 3, dni: '39-42345678-9', nombre: 'Pedro Gómez', vinculado: false },
]

export const contratos = [
  { id: 1, inquilino: 'Juan Pérez', propiedad: 'Av. Corrientes 1234', monto: 185000, vigencia: '01/2025 - 12/2026' },
  { id: 2, inquilino: 'Laura Sánchez', propiedad: 'Rivadavia 2100', monto: 220000, vigencia: '03/2025 - 02/2027' },
]

export const reclamosAdmin = [
  { id: 1, inquilino: 'Juan Pérez', titulo: 'Filtración en baño', estado: 'Pendiente' },
  { id: 2, inquilino: 'Laura Sánchez', titulo: 'Calefón sin encender', estado: 'En Proceso' },
  { id: 3, inquilino: 'Pedro Gómez', titulo: 'Persiana rota', estado: 'Resuelto' },
]

export const alquilerInquilino = {
  direccion: 'Av. Corrientes 1234, Piso 5, Depto B',
  diasRestantes: 214,
  montoMensual: 185000,
  reclamosActivos: 2,
}

export const reclamosInquilino = [
  { id: 1, titulo: 'Filtración en baño', fecha: '15/05/2026', estado: 'Pendiente' },
  { id: 2, titulo: 'Puerta del balcón trabada', fecha: '02/04/2026', estado: 'En Proceso' },
  { id: 3, titulo: 'Luz del pasillo', fecha: '10/01/2026', estado: 'Resuelto' },
]

export const documentosInquilino = [
  { id: 1, nombre: 'Contrato de Alquiler Firmado', tipo: 'PDF', fecha: '01/01/2025' },
  { id: 2, nombre: 'Recibo de Depósito', tipo: 'PDF', fecha: '28/12/2024' },
  { id: 3, nombre: 'Inventario de Entrega', tipo: 'PDF', fecha: '01/01/2025' },
]
