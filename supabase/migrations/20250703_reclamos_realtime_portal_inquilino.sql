-- Habilita Realtime en reclamos para avisar al inquilino cuando admin cambia el estado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reclamos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reclamos;
  END IF;
END $$;
