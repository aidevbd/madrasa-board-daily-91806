import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlusCircle, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthFunds, setMonthFunds] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);

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
        .select("amount")
        .eq("user_id", user.id);

      if (fundsError) throw fundsError;

      // Fetch all expenses
      const { data: allExpenses, error: expensesError } = await supabase
        .from("expenses")
        .select("total_price")
        .eq("user_id", user.id);

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
        .select("total_price")
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
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Dashboard;
