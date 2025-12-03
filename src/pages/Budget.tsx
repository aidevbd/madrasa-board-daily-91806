import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, AlertTriangle } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface Budget {
  id: string;
  category_id: string;
  monthly_limit: number;
  category: { name_bn: string };
  spent: number;
}

const Budget = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBudget, setNewBudget] = useState({ categoryId: "", limit: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [budgetsRes, categoriesRes, expensesRes] = await Promise.all([
        supabase
          .from("budgets")
          .select("*, expense_categories(name_bn)")
          .eq("user_id", user.id),
        supabase
          .from("expense_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name_bn"),
        supabase
          .from("expenses")
          .select("category_id, total_price")
          .eq("user_id", user.id)
          .gte("expense_date", firstDay.toISOString().split("T")[0])
          .lte("expense_date", lastDay.toISOString().split("T")[0])
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);

      if (budgetsRes.data && expensesRes.data) {
        const budgetsWithSpent = budgetsRes.data.map(budget => {
          const spent = expensesRes.data
            .filter(e => e.category_id === budget.category_id)
            .reduce((sum, e) => sum + Number(e.total_price), 0);
          
          return {
            ...budget,
            category: budget.expense_categories,
            spent
          };
        });
        setBudgets(budgetsWithSpent);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "ত্রুটি",
        description: "ডেটা লোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBudget = async () => {
    if (!newBudget.categoryId || !newBudget.limit) {
      toast({ title: "ত্রুটি", description: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        category_id: newBudget.categoryId,
        monthly_limit: Number(newBudget.limit),
      });

      if (error) throw error;

      toast({ title: "সফল", description: "বাজেট যোগ হয়েছে" });
      setNewBudget({ categoryId: "", limit: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error adding budget:", error);
      toast({
        title: "ত্রুটি",
        description: error.message || "বাজেট যোগে সমস্যা",
        variant: "destructive",
      });
    }
  };

  const deleteBudget = async (id: string) => {
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "সফল", description: "বাজেট মুছে ফেলা হয়েছে" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting budget:", error);
      toast({
        title: "ত্রুটি",
        description: "বাজেট মুছতে সমস্যা",
        variant: "destructive",
      });
    }
  };

  const getProgressColor = (spent: number, limit: number) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-primary";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-24 lg:pb-28">
      <div className="bg-primary text-primary-foreground p-4 md:p-6 shadow-md">
        <div className="flex items-center gap-3 md:gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">বাজেট ম্যানেজমেন্ট</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        <Card className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">নতুন বাজেট যোগ করুন</h2>
          <div className="space-y-4 md:space-y-5">
            <div>
              <Label className="text-sm md:text-base">ক্যাটাগরি</Label>
              <Select value={newBudget.categoryId} onValueChange={(value) => setNewBudget({ ...newBudget, categoryId: value })}>
                <SelectTrigger className="h-10 md:h-12 text-sm md:text-base">
                  <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => !budgets.find(b => b.category_id === cat.id))
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-sm md:text-base">
                        {cat.name_bn}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm md:text-base">মাসিক সীমা (টাকা)</Label>
              <Input
                type="number"
                value={newBudget.limit}
                onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                placeholder="যেমন: ৫০০০"
                className="h-10 md:h-12 text-sm md:text-base"
              />
            </div>
            <Button onClick={addBudget} className="w-full h-10 md:h-12 text-sm md:text-base">
              <Plus className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              বাজেট যোগ করুন
            </Button>
          </div>
        </Card>

        <div className="space-y-3 md:space-y-4">
          {budgets.length === 0 ? (
            <Card className="p-6 md:p-8 text-center">
              <p className="text-muted-foreground text-sm md:text-base">কোনো বাজেট সেট করা নেই</p>
            </Card>
          ) : (
            budgets.map((budget) => {
              const percentage = (budget.spent / budget.monthly_limit) * 100;
              const isOverBudget = percentage >= 100;
              const isNearLimit = percentage >= 80 && percentage < 100;

              return (
                <Card key={budget.id} className="p-4 md:p-6">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg md:text-xl flex items-center gap-2">
                        {budget.category.name_bn}
                        {isOverBudget && <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-destructive" />}
                        {isNearLimit && <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />}
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        {budget.spent.toFixed(2)} / {budget.monthly_limit.toFixed(2)} টাকা
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBudget(budget.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </div>
                  <Progress value={Math.min(percentage, 100)} className="h-2 md:h-3" />
                  <p className="text-xs md:text-sm text-muted-foreground mt-2">
                    {percentage.toFixed(0)}% ব্যবহৃত
                    {isOverBudget && " (বাজেট অতিক্রম করেছে!)"}
                    {isNearLimit && " (সীমার কাছাকাছি)"}
                  </p>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default Budget;
