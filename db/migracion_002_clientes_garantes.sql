-- ==========================================================
-- MIGRACIÓN 002: datos ampliados de clientes, garantes,
-- fotos de documentación y punitorios.
--
-- Cómo aplicarla: Supabase → SQL Editor → pegar todo → Run.
-- Se puede correr más de una vez sin romper nada.
-- ==========================================================

-- 1. Datos nuevos del cliente
--    (dni, telefono, direccion = domicilio y provincia_id ya existían)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(20) DEFAULT 'DNI';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS condicion_fiscal VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS localidad VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ocupacion VARCHAR(255);
-- Rutas de las fotos dentro del bucket "documentacion"
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documentos JSONB DEFAULT '[]'::jsonb;

-- 2. Garantes (uno o más por cliente)
CREATE TABLE IF NOT EXISTS garantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(20) DEFAULT 'DNI',
  dni VARCHAR(50),
  condicion_fiscal VARCHAR(100),
  email VARCHAR(255),
  telefono VARCHAR(100),
  direccion TEXT,
  localidad VARCHAR(255),
  provincia_id UUID REFERENCES provincias(id) ON DELETE SET NULL,
  ocupacion VARCHAR(255),
  documentos JSONB DEFAULT '[]'::jsonb,
  creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS garantes_cliente_id_idx ON garantes(cliente_id);

ALTER TABLE garantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garantes_usuarios_autenticados" ON garantes;
CREATE POLICY "garantes_usuarios_autenticados" ON garantes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Punitorio cobrado junto con un pago (separado del monto de la cuota)
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS punitorio NUMERIC(12,2) DEFAULT 0;
-- Detalle del cálculo: { "tasa": 0.5, "cada_dias": 1, "dias_atraso": 12 }
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS punitorio_detalle JSONB;

-- 4. Bucket PRIVADO para fotos de documentación
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentacion', 'documentacion', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documentacion_leer" ON storage.objects;
CREATE POLICY "documentacion_leer" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentacion');

DROP POLICY IF EXISTS "documentacion_subir" ON storage.objects;
CREATE POLICY "documentacion_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentacion');

DROP POLICY IF EXISTS "documentacion_borrar" ON storage.objects;
CREATE POLICY "documentacion_borrar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentacion');
