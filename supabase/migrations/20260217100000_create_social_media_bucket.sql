-- Create storage bucket for social post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own post images
CREATE POLICY "Users can upload their own post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own post images
CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'social-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to post images
CREATE POLICY "Public can view post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'social-media');
