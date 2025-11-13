-- Add batch_id column to expenses table to group bulk entries
ALTER TABLE public.expenses 
ADD COLUMN batch_id UUID NULL;

-- Add index for better query performance when filtering by batch_id
CREATE INDEX idx_expenses_batch_id ON public.expenses(batch_id);