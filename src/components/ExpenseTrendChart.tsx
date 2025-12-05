import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface ExpenseTrendChartProps {
  expenses: Array<{
    expense_date: string;
    total_price: number;
  }>;
  days?: number;
}

const ExpenseTrendChart = ({ expenses, days = 7 }: ExpenseTrendChartProps) => {
  const chartData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);
    
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    const expenseByDate = new Map<string, number>();
    expenses.forEach(expense => {
      const dateKey = format(new Date(expense.expense_date), "yyyy-MM-dd");
      const current = expenseByDate.get(dateKey) || 0;
      expenseByDate.set(dateKey, current + Number(expense.total_price));
    });
    
    return dateRange.map(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      return {
        date: format(date, "dd/MM"),
        fullDate: dateKey,
        amount: expenseByDate.get(dateKey) || 0,
      };
    });
  }, [expenses, days]);

  const maxAmount = Math.max(...chartData.map(d => d.amount), 100);

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-semibold text-base md:text-lg mb-4">খরচের ট্রেন্ড (গত {days} দিন)</h3>
      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(174, 62%, 47%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(174, 62%, 47%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `৳${value}`}
              domain={[0, maxAmount]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              formatter={(value: number) => [`৳${value.toFixed(2)}`, "খরচ"]}
              labelFormatter={(label) => `তারিখ: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(174, 62%, 47%)"
              strokeWidth={2}
              fill="url(#colorAmount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ExpenseTrendChart;
