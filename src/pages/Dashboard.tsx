import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusCircle, Wallet, TrendingDown, TrendingUp, History, Image as ImageIcon } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthFunds, setMonthFunds] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Fetch all funds
      const { data: allFunds, error: fundsError } = await supabase
        .from("funds")
        .select("*")
        .eq("user_id", user.id)
        .order("fund_date", { ascending: false });

      if (fundsError) throw fundsError;

      // Fetch all expenses
      const { data: allExpenses, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch this month's funds
      const { data: thisMonthFunds, error: monthFundsError } = await supabase
        .from("funds")
        .select("amount")
        .eq("user_id", user.id)
        .gte("fund_date", firstDay.toISOString().split("T")[0])
        .lte("fund_date", lastDay.toISOString().split("T")[0]);

      if (monthFundsError) throw monthFundsError;

      // Fetch this month's expenses
      const { data: thisMonthExpenses, error: monthExpensesError } = await supabase
        .from("expenses")
        .select("total_price, category_id, expense_categories(name_bn)")
        .eq("user_id", user.id)
        .gte("expense_date", firstDay.toISOString().split("T")[0])
        .lte("expense_date", lastDay.toISOString().split("T")[0]);

      if (monthExpensesError) throw monthExpensesError;

      const totalFunds = allFunds?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
      const totalExpenses = allExpenses?.reduce((sum, e) => sum + Number(e.total_price), 0) || 0;
      const monthlyFunds = thisMonthFunds?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
      const monthlyExpenses = thisMonthExpenses?.reduce((sum, e) => sum + Number(e.total_price), 0) || 0;

      setCurrentBalance(totalFunds - totalExpenses);
      setMonthFunds(monthlyFunds);
      setMonthExpenses(monthlyExpenses);

      // Calculate category expenses for chart
      const categoryMap = new Map();
      thisMonthExpenses?.forEach(expense => {
        const categoryName = expense.expense_categories?.name_bn || "অন্যান্য";
        const current = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, current + Number(expense.total_price));
      });

      const chartData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));
      setCategoryExpenses(chartData);

      // Get recent transactions
      const recent = [
        ...allExpenses.slice(0, 3).map(e => ({ ...e, type: 'expense' as const, date: e.expense_date })),
        ...allFunds.slice(0, 3).map(f => ({ ...f, type: 'fund' as const, date: f.fund_date }))
      ].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      }).slice(0, 5);
      
      setRecentTransactions(recent);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "ত্রুটি",
        description: "ডেটা লোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">লোড হচ্ছে...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6">ড্যাশবোর্ড</h1>
        
        <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5" />
              <p className="text-sm font-medium opacity-90">বর্তমান ব্যালেন্স</p>
            </div>
            <p className="text-4xl font-bold">৳ {currentBalance.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <p className="text-xs font-medium">এই মাসের জমা</p>
              </div>
              <p className="text-2xl font-bold text-foreground">৳ {monthFunds.toFixed(2)}</p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 text-red-600">
                <TrendingDown className="h-4 w-4" />
                <p className="text-xs font-medium">এই মাসের খরচ</p>
              </div>
              <p className="text-2xl font-bold text-foreground">৳ {monthExpenses.toFixed(2)}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            onClick={() => navigate("/add-expense")}
            size="lg"
            className="w-full h-16 text-lg font-semibold"
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            খরচ যুক্ত করুন
          </Button>

          <Button
            onClick={() => navigate("/add-fund")}
            size="lg"
            variant="secondary"
            className="w-full h-16 text-lg font-semibold"
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            জমা যোগ করুন
          </Button>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={() => navigate("/bulk-expense")}
              variant="outline"
              className="h-12"
            >
              বাজারের তালিকা
            </Button>
            <Button
              onClick={() => navigate("/receipts")}
              variant="outline"
              className="h-12"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              রশিদ গ্যালারি
            </Button>
          </div>
        </div>

        {recentTransactions.length > 0 && (
          <Card className="p-4 mt-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-lg">সাম্প্রতিক লেনদেন</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
                <History className="h-4 w-4 mr-1" />
                সব দেখুন
              </Button>
            </div>
            <div className="space-y-2">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {transaction.type === 'expense' ? transaction.item_name_bn : transaction.source_note_bn || 'জমা'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(transaction.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <p className={`font-semibold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                    {transaction.type === 'expense' ? '-' : '+'}৳ {Number(transaction.type === 'expense' ? transaction.total_price : transaction.amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Dashboard;
