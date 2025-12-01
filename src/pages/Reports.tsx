import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, Printer, FileText } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const CACHE_KEY = "last_report_data";

const Reports = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Load cached report on mount
  useEffect(() => {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setReportData(parsed);
        toast({
          title: "অফলাইন ডেটা লোড হয়েছে",
          description: "শেষ রিপোর্ট ক্যাশ থেকে লোড করা হয়েছে",
        });
      } catch (error) {
        console.error("Error loading cached report:", error);
      }
    }
  }, []);

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

      const newReportData = {
        startDate,
        endDate,
        totalFunds,
        totalExpenses,
        balance: totalFunds - totalExpenses,
        funds: fundsRes.data || [],
        expenses: expensesRes.data || [],
        categoryBreakdown,
        generatedAt: new Date().toISOString(),
      };

      setReportData(newReportData);

      // Cache the report for offline access
      localStorage.setItem(CACHE_KEY, JSON.stringify(newReportData));

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

  const exportPDF = async () => {
    if (!reportData) return;

    // Create a temporary container for PDF content
    const printContainer = document.createElement('div');
    printContainer.style.width = '800px';
    printContainer.style.padding = '20px';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.fontFamily = "'Noto Sans Bengali', sans-serif";
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    
    printContainer.innerHTML = `
      <div style="padding: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #333;">রিপোর্ট</h1>
        <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
          ${reportData.startDate} থেকে ${reportData.endDate}
        </p>
        
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; margin-bottom: 10px; color: #333;">সারসংক্ষেপ</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <p style="font-size: 12px; color: #666;">মোট জমা</p>
              <p style="font-size: 18px; font-weight: bold; color: #16a34a;">৳ ${reportData.totalFunds.toFixed(2)}</p>
            </div>
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px;">
              <p style="font-size: 12px; color: #666;">মোট খরচ</p>
              <p style="font-size: 18px; font-weight: bold; color: #dc2626;">৳ ${reportData.totalExpenses.toFixed(2)}</p>
            </div>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px;">
              <p style="font-size: 12px; color: #666;">ব্যালেন্স</p>
              <p style="font-size: 18px; font-weight: bold; color: #2563eb;">৳ ${reportData.balance.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; margin-bottom: 10px; color: #333;">ক্যাটাগরি অনুযায়ী</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">ক্যাটাগরি</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(reportData.categoryBreakdown).map(([category, amount]: any) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${category}</td>
                  <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">৳ ${amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; margin-bottom: 10px; color: #333;">খরচের তালিকা</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">তারিখ</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">বিবরণ</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">ক্যাটাগরি</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.expenses.map((expense: any) => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expense.expense_date}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expense.item_name_bn}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${expense.expense_categories?.name_bn || ''}</td>
                  <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #dc2626;">৳ ${Number(expense.total_price).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        ${reportData.funds.length > 0 ? `
          <div>
            <h2 style="font-size: 18px; margin-bottom: 10px; color: #333;">জমার তালিকা</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">তারিখ</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">বিবরণ</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.funds.map((fund: any) => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${fund.fund_date}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${fund.source_note_bn || 'জমা'}</td>
                    <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #16a34a;">৳ ${Number(fund.amount).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(printContainer);
    
    try {
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`report_${reportData.startDate}_${reportData.endDate}.pdf`);
      
      toast({
        title: "PDF রপ্তানি সফল",
        description: "ফাইল ডাউনলোড হয়েছে",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "ত্রুটি",
        description: "PDF রপ্তানি করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      document.body.removeChild(printContainer);
    }
  };

  // Prepare chart data
  const pieChartData = reportData
    ? Object.entries(reportData.categoryBreakdown).map(([name, value]: any) => ({
        name,
        value,
      }))
    : [];

  const barChartData = reportData
    ? [
        { name: "জমা", value: reportData.totalFunds },
        { name: "খরচ", value: reportData.totalExpenses },
        { name: "ব্যালেন্স", value: reportData.balance },
      ]
    : [];

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
                <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-xl">
                  <p className="text-xs text-muted-foreground">মোট জমা</p>
                  <p className="text-lg font-bold text-green-600">৳ {reportData.totalFunds.toFixed(2)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl">
                  <p className="text-xs text-muted-foreground">মোট খরচ</p>
                  <p className="text-lg font-bold text-red-600">৳ {reportData.totalExpenses.toFixed(2)}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <p className="text-xs text-muted-foreground">ব্যালেন্স</p>
                  <p className="text-lg font-bold text-primary">৳ {reportData.balance.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            {/* Bar Chart */}
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">আর্থিক সারসংক্ষেপ</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `৳ ${Number(value).toFixed(2)}`} />
                  <Bar dataKey="value" fill="#8884d8">
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Pie Chart */}
            {pieChartData.length > 0 && (
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold">ক্যাটাগরি অনুযায়ী খরচ</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `৳ ${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold">ক্যাটাগরি অনুযায়ী</h3>
              {Object.entries(reportData.categoryBreakdown).map(([category, amount]: any) => (
                <div key={category} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{category}</span>
                  <span className="font-semibold">৳ {amount.toFixed(2)}</span>
                </div>
              ))}
            </Card>

            <div className="grid grid-cols-3 gap-3">
              <Button onClick={exportCSV} variant="outline" size="sm">
                <FileDown className="mr-1 h-4 w-4" />
                CSV
              </Button>
              <Button onClick={exportPDF} variant="outline" size="sm">
                <FileText className="mr-1 h-4 w-4" />
                PDF
              </Button>
              <Button onClick={() => window.print()} variant="outline" size="sm">
                <Printer className="mr-1 h-4 w-4" />
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

            {reportData.generatedAt && (
              <p className="text-xs text-center text-muted-foreground">
                তৈরি হয়েছে: {new Date(reportData.generatedAt).toLocaleString("bn-BD")}
              </p>
            )}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Reports;