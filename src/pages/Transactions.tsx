import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Trash2, Search, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditMode } from "@/hooks/useEditMode";
import EditItemDialog from "@/components/EditItemDialog";

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isEditMode } = useEditMode();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [editExpense, setEditExpense] = useState<any | null>(null);
  const [editFund, setEditFund] = useState<any | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'expense' | 'fund' | 'batch' | null; id: string | null; batchId?: string | null }>({
    open: false,
    type: null,
    id: null,
    batchId: null
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [expensesRes, fundsRes, categoriesRes, unitsRes] = await Promise.all([
        supabase
          .from("expenses")
          .select("*, expense_categories(name_bn), units(name_bn)")
          .eq("user_id", user.id)
          .order("expense_date", { ascending: false })
          .limit(100),
        supabase
          .from("funds")
          .select("*")
          .eq("user_id", user.id)
          .order("fund_date", { ascending: false })
          .limit(100),
        supabase
          .from("expense_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name_bn"),
        supabase
          .from("units")
          .select("*")
          .eq("user_id", user.id)
          .order("name_bn")
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data);
      if (fundsRes.data) setFunds(fundsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "ত্রুটি",
        description: "ডেটা লোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id && !deleteDialog.batchId) return;

    try {
      if (deleteDialog.type === 'batch' && deleteDialog.batchId) {
        // Delete all expenses in the batch
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('batch_id', deleteDialog.batchId);

        if (error) throw error;
      } else if (deleteDialog.type === 'expense') {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', deleteDialog.id);

        if (error) throw error;
      } else if (deleteDialog.type === 'fund') {
        const { error } = await supabase
          .from('funds')
          .delete()
          .eq('id', deleteDialog.id);

        if (error) throw error;
      }

      toast({
        title: "সফল",
        description: "মুছে ফেলা হয়েছে",
      });

      fetchTransactions();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "ত্রুটি",
        description: "মুছে ফেলতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ open: false, type: null, id: null, batchId: null });
    }
  };

  const filteredExpenses = expenses.filter(e =>
    e.item_name_bn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFunds = funds.filter(f =>
    f.source_note_bn?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group expenses by batch_id
  const groupedExpenses = () => {
    const groups: { [key: string]: any[] } = {};
    const singles: any[] = [];

    filteredExpenses.forEach(expense => {
      if (expense.batch_id) {
        if (!groups[expense.batch_id]) {
          groups[expense.batch_id] = [];
        }
        groups[expense.batch_id].push(expense);
      } else {
        singles.push(expense);
      }
    });

    return { groups, singles };
  };

  const { groups: batchGroups, singles: singleExpenses } = groupedExpenses();

  const toggleBatch = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">লোড হচ্ছে...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-28 lg:pb-32">
      <div className="bg-primary text-primary-foreground p-4 md:p-6 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 md:gap-4 max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">লেনদেনের তালিকা</h1>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-4xl mx-auto">
        <div className="space-y-3 md:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 md:top-4 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <Input
              placeholder="খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 md:pl-12 h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="flex gap-2 md:gap-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="flex-1 h-10 md:h-12 text-sm md:text-base">
                <SelectValue placeholder="তারিখ ফিল্টার" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm md:text-base">সব তারিখ</SelectItem>
                <SelectItem value="today" className="text-sm md:text-base">আজ</SelectItem>
                <SelectItem value="week" className="text-sm md:text-base">এই সপ্তাহ</SelectItem>
                <SelectItem value="month" className="text-sm md:text-base">এই মাস</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1 h-10 md:h-12 text-sm md:text-base">
                <SelectValue placeholder="ক্যাটাগরি ফিল্টার" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm md:text-base">সব ক্যাটাগরি</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-sm md:text-base">
                    {cat.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="w-full h-10 md:h-12">
            <TabsTrigger value="expenses" className="flex-1 text-sm md:text-base">
              <TrendingDown className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              খরচ ({filteredExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="funds" className="flex-1 text-sm md:text-base">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              জমা ({filteredFunds.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-3 mt-4">
            {filteredExpenses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">কোন খরচ পাওয়া যায়নি</p>
                <Button onClick={() => navigate("/add-expense")} className="mt-4">
                  খরচ যুক্ত করুন
                </Button>
              </Card>
            ) : (
              <>
                {/* Render batch groups */}
                {Object.entries(batchGroups).map(([batchId, batchExpenses]) => {
                  const totalAmount = batchExpenses.reduce((sum, exp) => sum + Number(exp.total_price), 0);
                  const firstExpense = batchExpenses[0];
                  const isExpanded = expandedBatches.has(batchId);

                  return (
                    <Card key={batchId} className="p-4 border-2 border-primary/20">
                      <Collapsible open={isExpanded} onOpenChange={() => toggleBatch(batchId)}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">বাজারের তালিকা</h3>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                {batchExpenses.length} টি আইটেম
                              </span>
                            </div>
                            {firstExpense.expense_categories && (
                              <p className="text-sm text-muted-foreground">{firstExpense.expense_categories.name_bn}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(firstExpense.expense_date), "dd/MM/yyyy")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-red-600">৳ {totalAmount.toFixed(2)}</p>
                          </div>
                        </div>

                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full mb-2">
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                লুকান
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-2" />
                                বিস্তারিত দেখুন
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="space-y-2 mt-3 pt-3 border-t">
                          {batchExpenses.map((expense) => (
                            <div key={expense.id} className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded">
                              <div className="flex-1">
                                <p className="font-medium">{expense.item_name_bn}</p>
                                {expense.quantity && expense.units && (
                                  <p className="text-xs text-muted-foreground">
                                    {Number(expense.quantity)} {expense.units.name_bn}
                                  </p>
                                )}
                              </div>
                              <p className="font-semibold text-red-600">৳ {Number(expense.total_price).toFixed(2)}</p>
                            </div>
                          ))}
                        </CollapsibleContent>

                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, type: 'batch', id: null, batchId })}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            সম্পূর্ণ মুছুন
                          </Button>
                        </div>
                      </Collapsible>
                    </Card>
                  );
                })}

                {/* Render single expenses */}
                {singleExpenses.map((expense) => (
                  <Card key={expense.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{expense.item_name_bn}</h3>
                        {expense.expense_categories && (
                          <p className="text-sm text-muted-foreground">{expense.expense_categories.name_bn}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(expense.expense_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-600">৳ {Number(expense.total_price).toFixed(2)}</p>
                        {expense.quantity && expense.units && (
                          <p className="text-sm text-muted-foreground">
                            {Number(expense.quantity)} {expense.units.name_bn}
                          </p>
                        )}
                      </div>
                    </div>
                    {expense.notes && (
                      <p className="text-sm text-muted-foreground mb-3">{expense.notes}</p>
                    )}
                    <div className="flex gap-2">
                      {isEditMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditExpense(expense)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          এডিট
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, type: 'expense', id: expense.id })}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        মুছুন
                      </Button>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="funds" className="space-y-3 mt-4">
            {filteredFunds.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">কোন জমা পাওয়া যায়নি</p>
                <Button onClick={() => navigate("/add-fund")} className="mt-4">
                  জমা যোগ করুন
                </Button>
              </Card>
            ) : (
              filteredFunds.map((fund) => (
                <Card key={fund.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {fund.source_note_bn || "জমা"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(fund.fund_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">৳ {Number(fund.amount).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditFund(fund)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        এডিট
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, type: 'fund', id: fund.id })}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      মুছুন
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>নিশ্চিত করুন</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি এটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>মুছে ফেলুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialogs */}
      {editExpense && (
        <EditItemDialog
          open={!!editExpense}
          onOpenChange={(open) => !open && setEditExpense(null)}
          title="খরচ এডিট করুন"
          fields={[
            { name: "item_name_bn", label: "আইটেমের নাম", value: editExpense.item_name_bn, type: "text" },
            { name: "total_price", label: "মোট মূল্য (৳)", value: editExpense.total_price, type: "number" },
            { name: "expense_date", label: "তারিখ", value: editExpense.expense_date, type: "date" },
            { 
              name: "category_id", 
              label: "ক্যাটাগরি", 
              value: editExpense.category_id || "", 
              type: "select",
              options: categories.map(c => ({ value: c.id, label: c.name_bn }))
            },
          ]}
          onSave={async (values) => {
            const { error } = await supabase
              .from("expenses")
              .update({
                item_name_bn: String(values.item_name_bn),
                total_price: Number(values.total_price),
                expense_date: String(values.expense_date),
                category_id: values.category_id ? String(values.category_id) : null,
              })
              .eq("id", editExpense.id);
            if (error) throw error;
            toast({ title: "সফল", description: "খরচ আপডেট হয়েছে" });
            fetchTransactions();
          }}
        />
      )}

      {editFund && (
        <EditItemDialog
          open={!!editFund}
          onOpenChange={(open) => !open && setEditFund(null)}
          title="জমা এডিট করুন"
          fields={[
            { name: "source_note_bn", label: "উৎস/নোট", value: editFund.source_note_bn || "", type: "text" },
            { name: "amount", label: "পরিমাণ (৳)", value: editFund.amount, type: "number" },
            { name: "fund_date", label: "তারিখ", value: editFund.fund_date, type: "date" },
          ]}
          onSave={async (values) => {
            const { error } = await supabase
              .from("funds")
              .update({
                source_note_bn: values.source_note_bn ? String(values.source_note_bn) : null,
                amount: Number(values.amount),
                fund_date: String(values.fund_date),
              })
              .eq("id", editFund.id);
            if (error) throw error;
            toast({ title: "সফল", description: "জমা আপডেট হয়েছে" });
            fetchTransactions();
          }}
        />
      )}

      <Navigation />
    </div>
  );
};

export default Transactions;
