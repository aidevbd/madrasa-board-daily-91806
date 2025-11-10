-- Add default_qty and default_unit_id to favorites table
ALTER TABLE public.favorites 
ADD COLUMN IF NOT EXISTS default_qty NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS default_unit_id UUID REFERENCES public.units(id);

-- Add name column to expense_categories (for English names)
ALTER TABLE public.expense_categories 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add name column to units (for English names)
ALTER TABLE public.units 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update existing categories to have name field matching name_bn
UPDATE public.expense_categories SET name = name_bn WHERE name IS NULL;
UPDATE public.units SET name = name_bn WHERE name IS NULL;

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, key)
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings
CREATE POLICY "Users can manage own settings"
  ON public.settings
  FOR ALL
  USING (auth.uid() = user_id);

-- Add trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial categories (if not already present)
INSERT INTO public.expense_categories (name, name_bn, user_id)
SELECT 'Vegetables', 'সবজি', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name_bn = 'সবজি')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (name, name_bn, user_id)
SELECT 'Fish', 'মাছ', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name_bn = 'মাছ')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (name, name_bn, user_id)
SELECT 'Meat', 'মাংস', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name_bn = 'মাংস')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (name, name_bn, user_id)
SELECT 'Rice & Lentils', 'চাল-ডাল', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name_bn = 'চাল-ডাল')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (name, name_bn, user_id)
SELECT 'Spices', 'মসলা', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name_bn = 'মসলা')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (name, name_bn, user_id)
SELECT 'Others', 'অন্যান্য', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE name_bn = 'অন্যান্য')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- Seed initial units (if not already present)
INSERT INTO public.units (name, name_bn, user_id)
SELECT 'Kg', 'কেজি', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE name_bn = 'কেজি')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.units (name, name_bn, user_id)
SELECT 'Liter', 'লিটার', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE name_bn = 'লিটার')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.units (name, name_bn, user_id)
SELECT 'Piece', 'পিস', auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.units WHERE name_bn = 'পিস')
  AND auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;