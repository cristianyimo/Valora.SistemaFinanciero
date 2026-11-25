-- ==========================================
-- SCRIPT COMPLETO DE RESPALDO DE ESTRUCTURA
-- Refleja las columnas que usa la aplicación (src/componentes).
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Provincias
CREATE TABLE IF NOT EXISTS provincias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL
);

-- Tabla de Usuarios (owner / admin / inversionista)
-- El id coincide con auth.users.id de Supabase Auth.
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo VARCHAR(255) NOT NULL,
  dni VARCHAR(50),
  email VARCHAR(255),
  telefono VARCHAR(100),
  direccion TEXT,
  rol VARCHAR(50) DEFAULT 'inversionista' CHECK (rol IN ('owner', 'admin', 'inversionista')),
  provincia_id UUID REFERENCES provincias(id) ON DELETE SET NULL,
  capital_disponible NUMERIC(12,2) DEFAULT 0,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo VARCHAR(255) NOT NULL,
  dni VARCHAR(50),
  telefono VARCHAR(100),
  direccion TEXT,
  inversionista_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  provincia_id UUID REFERENCES provincias(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Planes de Préstamo (opciones de préstamo)
-- opciones_cuotas: [{ "cuotas": 3, "interes": 15 }, ...]
-- tasa_interes / plazo_cuotas guardan la primera opción (compatibilidad).
CREATE TABLE IF NOT EXISTS planes_prestamo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255),
  monto NUMERIC(12,2),
  tasa_interes NUMERIC(5,2) NOT NULL DEFAULT 0,
  plazo_cuotas INT DEFAULT 1,
  opciones_cuotas JSONB DEFAULT '[]'::jsonb,
  frecuencia_pago VARCHAR(50) DEFAULT 'mensual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Préstamos
CREATE TABLE IF NOT EXISTS prestamos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  inversionista_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  provincia_id UUID REFERENCES provincias(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  monto_capital NUMERIC(12,2) NOT NULL,
  monto_total_pagar NUMERIC(12,2) NOT NULL,
  monto_cuota NUMERIC(12,2) NOT NULL,
  cantidad_cuotas INT NOT NULL DEFAULT 1,
  frecuencia VARCHAR(50) DEFAULT 'mensual',
  estado VARCHAR(50) DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado', 'cancelado', 'pendiente', 'cobrado')),
  fecha_inicio DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Las cuotas no se guardan en una tabla: el cronograma se calcula en la app
-- a partir del préstamo y sus pagos (ver src/lib/finanzas.js).

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestamo_id UUID REFERENCES prestamos(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  inversionista_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  monto_cobrado NUMERIC(12,2) NOT NULL,
  metodo_pago VARCHAR(100) DEFAULT 'efectivo',
  observaciones TEXT,
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Auditoría (Registros recientes)
CREATE TABLE IF NOT EXISTS auditoria_actividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(50) NOT NULL,        -- CLIENTE, INVERSIONISTA, ADMIN, PRÉSTAMO, COBRO
  accion VARCHAR(50) NOT NULL,      -- CREADO, EDITADO, COBRO, ...
  titulo TEXT,
  subtitulo TEXT,
  detalles TEXT,
  persona VARCHAR(255),
  autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nombre VARCHAR(255),
  autor_rol VARCHAR(50),
  estado VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
