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

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch this month's data
    const [fundsRes, expensesRes] = await Promise.all([
      supabaseClient
        .from('funds')
        .select('*')
        .eq('user_id', user.id)
        .gte('fund_date', startDate)
        .lte('fund_date', endDate)
        .order('fund_date', { ascending: false }),
      supabaseClient
        .from('expenses')
        .select('*, expense_categories(name_bn)')
        .eq('user_id', user.id)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false }),
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
      start_date: startDate,
      end_date: endDate,
      total_funds,
      total_expenses,
      balance: total_funds - total_expenses,
      category_breakdown,
      detailed_list: [...(expensesRes.data || []), ...(fundsRes.data || [])],
    };

    console.log('Monthly report generated:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating monthly report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
