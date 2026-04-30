-- Bucket privé pour les photos « Qui pointe ? » (chemins référencés par photo_analyses.storage_path)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'game-photos',
  'game-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Lecture : propriétaire du fichier (dossier = user id)
CREATE POLICY "game_photos_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'game-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Écriture
CREATE POLICY "game_photos_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'game-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "game_photos_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'game-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "game_photos_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'game-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
