-- Add category and tags columns to repositories
ALTER TABLE public.repositories
ADD COLUMN category text DEFAULT 'uncategorized',
ADD COLUMN tags text[] DEFAULT '{}'::text[];

-- Create index for category filtering
CREATE INDEX idx_repositories_category ON public.repositories(category);
CREATE INDEX idx_repositories_tags ON public.repositories USING GIN(tags);