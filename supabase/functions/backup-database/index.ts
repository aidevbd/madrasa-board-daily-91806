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
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use ANON_KEY with user's JWT to respect RLS policies
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all data for this user
    const [
      expensesRes,
      fundsRes,
      categoriesRes,
      unitsRes,
      favoritesRes,
      settingsRes,
    ] = await Promise.all([
      supabaseClient.from('expenses').select('*').eq('user_id', user.id),
      supabaseClient.from('funds').select('*').eq('user_id', user.id),
      supabaseClient.from('expense_categories').select('*').eq('user_id', user.id),
      supabaseClient.from('units').select('*').eq('user_id', user.id),
      supabaseClient.from('favorites').select('*').eq('user_id', user.id),
      supabaseClient.from('settings').select('*').eq('user_id', user.id),
    ]);

    // Check for errors
    const errors = [
      expensesRes.error,
      fundsRes.error,
      categoriesRes.error,
      unitsRes.error,
      favoritesRes.error,
      settingsRes.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      throw new Error(`Database errors: ${errors.map(e => e?.message).join(', ')}`);
    }

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      data: {
        expenses: expensesRes.data || [],
        funds: fundsRes.data || [],
        expense_categories: categoriesRes.data || [],
        units: unitsRes.data || [],
        favorites: favoritesRes.data || [],
        settings: settingsRes.data || [],
      },
      stats: {
        total_expenses: expensesRes.data?.length || 0,
        total_funds: fundsRes.data?.length || 0,
        total_categories: categoriesRes.data?.length || 0,
        total_units: unitsRes.data?.length || 0,
        total_favorites: favoritesRes.data?.length || 0,
      },
    };

    console.log('Backup created successfully:', backup.stats);

    // Return the backup as JSON
    return new Response(JSON.stringify(backup), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="daily-boarding-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
