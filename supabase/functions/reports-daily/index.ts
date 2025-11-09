import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch today's data
    const [fundsRes, expensesRes] = await Promise.all([
      supabaseClient
        .from('funds')
        .select('amount')
        .eq('user_id', user.id)
        .eq('fund_date', today),
      supabaseClient
        .from('expenses')
        .select('total_price, expense_categories(name_bn)')
        .eq('user_id', user.id)
        .eq('expense_date', today),
    ]);

    if (fundsRes.error) throw fundsRes.error;
    if (expensesRes.error) throw expensesRes.error;

    const total_funds = fundsRes.data?.reduce((sum: number, f: any) => sum + Number(f.amount), 0) || 0;
    const total_expenses = expensesRes.data?.reduce((sum: number, e: any) => sum + Number(e.total_price), 0) || 0;

    // Category breakdown
    const category_breakdown: any = {};
    expensesRes.data?.forEach((expense: any) => {
      const categoryName = expense.expense_categories?.name_bn || 'অন্যান্য';
      if (!category_breakdown[categoryName]) {
        category_breakdown[categoryName] = 0;
      }
      category_breakdown[categoryName] += Number(expense.total_price);
    });

    const response = {
      date: today,
      total_funds,
      total_expenses,
      balance: total_funds - total_expenses,
      category_breakdown,
      detailed_list: expensesRes.data || [],
    };

    console.log('Daily report generated:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating daily report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
