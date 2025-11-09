import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Printer } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const generateReport = async (type: "daily" | "monthly" | "custom") => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      let startDate, endDate;
      const now = new Date();

      if (type === "daily") {
        startDate = endDate = now.toISOString().split("T")[0];
      } else if (type === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      } else {
        startDate = dateRange.start;
        endDate = dateRange.end;
      }

      const [fundsRes, expensesRes] = await Promise.all([
        supabase
          .from("funds")
          .select("*")
          .eq("user_id", user.id)
          .gte("fund_date", startDate)
          .lte("fund_date", endDate)
          .order("fund_date", { ascending: false }),
        supabase
          .from("expenses")
          .select("*, expense_categories(name_bn), units(name_bn)")
          .eq("user_id", user.id)
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .order("expense_date", { ascending: false }),
      ]);

      if (fundsRes.error) throw fundsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const totalFunds = fundsRes.data?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
      const totalExpenses = expensesRes.data?.reduce((sum, e) => sum + Number(e.total_price), 0) || 0;

      // Group expenses by category
      const categoryBreakdown: any = {};
      expensesRes.data?.forEach((expense) => {
        const categoryName = expense.expense_categories?.name_bn || "অন্যান্য";
        if (!categoryBreakdown[categoryName]) {
          categoryBreakdown[categoryName] = 0;
        }
        categoryBreakdown[categoryName] += Number(expense.total_price);
      });

      setReportData({
        startDate,
        endDate,
        totalFunds,
        totalExpenses,
        balance: totalFunds - totalExpenses,
        funds: fundsRes.data || [],
        expenses: expensesRes.data || [],
        categoryBreakdown,
      });

      toast({
        title: "রিপোর্ট তৈরি হয়েছে",
        description: `${startDate} থেকে ${endDate}`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "ত্রুটি",
        description: "রিপোর্ট তৈরিতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!reportData) return;

    let csv = "তারিখ,বিবরণ,ক্যাটাগরি,পরিমাণ,টাইপ\n";
    
    reportData.funds.forEach((fund: any) => {
      csv += `${fund.fund_date},"${fund.source_note_bn || 'জমা'}","জমা",${fund.amount},জমা\n`;
    });
    
    reportData.expenses.forEach((expense: any) => {
      csv += `${expense.expense_date},"${expense.item_name_bn}","${expense.expense_categories?.name_bn || ''}",${expense.total_price},খরচ\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${reportData.startDate}_${reportData.endDate}.csv`;
    link.click();

    toast({
      title: "CSV রপ্তানি সফল",
      description: "ফাইল ডাউনলোড হয়েছে",
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <h1 className="text-xl font-bold">রিপোর্ট</h1>
      </div>

      <div className="p-4 space-y-4">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">দৈনিক</TabsTrigger>
            <TabsTrigger value="monthly">মাসিক</TabsTrigger>
            <TabsTrigger value="custom">কাস্টম</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Button onClick={() => generateReport("daily")} disabled={loading} className="w-full">
              আজকের রিপোর্ট দেখুন
            </Button>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <Button onClick={() => generateReport("monthly")} disabled={loading} className="w-full">
              এই মাসের রিপোর্ট দেখুন
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>শুরুর তারিখ</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>শেষ তারিখ</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={() => generateReport("custom")} disabled={loading} className="w-full">
              রিপোর্ট তৈরি করুন
            </Button>
          </TabsContent>
        </Tabs>

        {reportData && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-lg">সারসংক্ষেপ</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">মোট জমা</p>
                  <p className="text-lg font-bold text-green-600">৳ {reportData.totalFunds.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">মোট খরচ</p>
                  <p className="text-lg font-bold text-red-600">৳ {reportData.totalExpenses.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ব্যালেন্স</p>
                  <p className="text-lg font-bold text-primary">৳ {reportData.balance.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">ক্যাটাগরি অনুযায়ী</h3>
              {Object.entries(reportData.categoryBreakdown).map(([category, amount]: any) => (
                <div key={category} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{category}</span>
                  <span className="font-semibold">৳ {amount.toFixed(2)}</span>
                </div>
              ))}
            </Card>

            <div className="flex gap-3">
              <Button onClick={exportCSV} variant="outline" className="flex-1">
                <FileDown className="mr-2 h-4 w-4" />
                CSV রপ্তানি
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                প্রিন্ট
              </Button>
            </div>

            <Card className="p-4 space-y-2">
              <h3 className="font-semibold mb-3">বিস্তারিত তালিকা</h3>
              {reportData.expenses.map((expense: any) => (
                <div key={expense.id} className="flex justify-between py-2 border-b text-sm">
                  <div>
                    <p className="font-medium">{expense.item_name_bn}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.expense_date} • {expense.expense_categories?.name_bn}
                    </p>
                  </div>
                  <p className="font-semibold text-red-600">-৳ {Number(expense.total_price).toFixed(2)}</p>
                </div>
              ))}
              {reportData.funds.map((fund: any) => (
                <div key={fund.id} className="flex justify-between py-2 border-b text-sm">
                  <div>
                    <p className="font-medium">{fund.source_note_bn || "জমা"}</p>
                    <p className="text-xs text-muted-foreground">{fund.fund_date}</p>
                  </div>
                  <p className="font-semibold text-green-600">+৳ {Number(fund.amount).toFixed(2)}</p>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Reports;
