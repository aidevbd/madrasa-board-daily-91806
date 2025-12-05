import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusCircle, Wallet, TrendingDown, TrendingUp, History, Image as ImageIcon } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import ExpenseTrendChart from "@/components/ExpenseTrendChart";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthFunds, setMonthFunds] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<any[]>([]);
  const [last7DaysExpenses, setLast7DaysExpenses] = useState<any[]>([]);

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

      // Get last 7 days expenses for trend chart
      const sevenDaysAgo = subDays(new Date(), 7);
      const recentExpensesForChart = allExpenses?.filter(e => 
        new Date(e.expense_date) >= sevenDaysAgo
      ) || [];
      setLast7DaysExpenses(recentExpensesForChart);

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
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-24 lg:pb-28">
      <div className="bg-primary text-primary-foreground p-6 md:p-8 lg:p-10 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 md:mb-8">ড্যাশবোর্ড</h1>
        
        <Card className="bg-primary-foreground/10 border-primary-foreground/20 backdrop-blur-sm max-w-2xl mx-auto">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <Wallet className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
              <p className="text-sm md:text-base lg:text-lg font-medium opacity-90">বর্তমান ব্যালেন্স</p>
            </div>
            <p className="text-4xl md:text-5xl lg:text-6xl font-bold">৳ {currentBalance.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <Card>
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 text-green-600">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                <p className="text-xs md:text-sm lg:text-base font-medium">এই মাসের জমা</p>
              </div>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">৳ {monthFunds.toFixed(2)}</p>
            </div>
          </Card>

          <Card>
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 text-red-600">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                <p className="text-xs md:text-sm lg:text-base font-medium">এই মাসের খরচ</p>
              </div>
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">৳ {monthExpenses.toFixed(2)}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-3 md:space-y-4 pt-4 md:pt-6">
          <Button
            onClick={() => navigate("/add-expense")}
            size="lg"
            className="w-full h-16 md:h-18 lg:h-20 text-lg md:text-xl lg:text-2xl font-semibold"
          >
            <PlusCircle className="mr-2 h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8" />
            খরচ যুক্ত করুন
          </Button>

          <Button
            onClick={() => navigate("/add-fund")}
            size="lg"
            variant="secondary"
            className="w-full h-16 md:h-18 lg:h-20 text-lg md:text-xl lg:text-2xl font-semibold"
          >
            <PlusCircle className="mr-2 h-6 w-6 md:h-7 md:w-7 lg:h-8 lg:w-8" />
            জমা যোগ করুন
          </Button>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2 md:pt-4">
            <Button
              onClick={() => navigate("/bulk-expense")}
              variant="outline"
              className="h-12 md:h-14 lg:h-16 text-sm md:text-base lg:text-lg"
            >
              বাজারের তালিকা
            </Button>
            <Button
              onClick={() => navigate("/receipts")}
              variant="outline"
              className="h-12 md:h-14 lg:h-16 text-sm md:text-base lg:text-lg"
            >
              <ImageIcon className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              রশিদ গ্যালারি
            </Button>
          </div>
        </div>

        {/* Expense Trend Chart */}
        {last7DaysExpenses.length > 0 && (
          <ExpenseTrendChart expenses={last7DaysExpenses} days={7} />
        )}

        {recentTransactions.length > 0 && (
          <Card className="p-4 md:p-6 mt-6">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="font-semibold text-lg md:text-xl lg:text-2xl">সাম্প্রতিক লেনদেন</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")} className="text-sm md:text-base">
                <History className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                সব দেখুন
              </Button>
            </div>
            <div className="space-y-2 md:space-y-3">
              {recentTransactions.map((transaction, index) => (
                <div key={index} className="flex justify-between items-center py-2 md:py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm md:text-base lg:text-lg">
                      {transaction.type === 'expense' ? transaction.item_name_bn : transaction.source_note_bn || 'জমা'}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {format(new Date(transaction.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <p className={`font-semibold text-base md:text-lg lg:text-xl ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
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
