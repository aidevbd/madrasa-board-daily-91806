-- Create tags table
CREATE TABLE public.expense_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name_bn TEXT NOT NULL,
  color TEXT DEFAULT 'hsl(174, 62%, 47%)',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense_tag_relations junction table for many-to-many
CREATE TABLE public.expense_tag_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.expense_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(expense_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.expense_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_tag_relations ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_tags
CREATE POLICY "Users can manage own tags" 
ON public.expense_tags 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for expense_tag_relations
CREATE POLICY "Users can manage own tag relations" 
ON public.expense_tag_relations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.expenses 
    WHERE id = expense_tag_relations.expense_id 
    AND user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_expense_tags_updated_at
BEFORE UPDATE ON public.expense_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();