import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";

interface BulkExpenseItem {
  id: string;
  item_name_bn: string;
  category_id: string;
  quantity: string;
  unit_id: string;
  unit_price: string;
  total_price: number;
}

export default function BulkExpense() {
  const navigate = useNavigate();
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [items, setItems] = useState<BulkExpenseItem[]>([
    { id: crypto.randomUUID(), item_name_bn: "", category_id: "", quantity: "", unit_id: "", unit_price: "", total_price: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchUnits();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("expense_categories").select("*").order("name_bn");
    if (data) setCategories(data);
  };

  const fetchUnits = async () => {
    const { data } = await supabase.from("units").select("*").order("name_bn");
    if (data) setUnits(data);
  };

  const addNewRow = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      item_name_bn: "", 
      category_id: "", 
      quantity: "", 
      unit_id: "", 
      unit_price: "", 
      total_price: 0 
    }]);
  };

  const removeRow = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BulkExpenseItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-calculate total price
        if (field === 'quantity' || field === 'unit_price') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
          const price = parseFloat(field === 'unit_price' ? value : updated.unit_price) || 0;
          updated.total_price = qty * price;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const totalItems = items.filter(item => item.item_name_bn.trim() !== "").length;
    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
    return { totalItems, totalAmount };
  };

  const handleSubmit = async () => {
    const validItems = items.filter(item => 
      item.item_name_bn.trim() !== "" && 
      item.quantity !== "" && 
      item.unit_price !== ""
    );

    if (validItems.length === 0) {
      toast.error("অন্তত একটি আইটেম যোগ করুন");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const expensesToInsert = validItems.map(item => ({
        user_id: user?.id,
        expense_date: expenseDate,
        item_name_bn: item.item_name_bn,
        category_id: item.category_id || null,
        quantity: parseFloat(item.quantity),
        unit_id: item.unit_id || null,
        total_price: item.total_price
      }));

      const { error } = await supabase.from("expenses").insert(expensesToInsert);

      if (error) throw error;

      toast.success(`${validItems.length}টি খরচ সফলভাবে যোগ হয়েছে`);
      navigate("/transactions");
    } catch (error) {
      console.error("Error saving bulk expenses:", error);
      toast.error("খরচ যোগ করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const { totalItems, totalAmount } = calculateTotals();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">বাজারের তালিকা</h1>
      </div>

      <div className="container mx-auto p-4 space-y-4">
        <Card className="p-4">
          <div className="space-y-2">
            <Label>তারিখ</Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full"
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">আইটেম তালিকা</h2>
              <Button onClick={addNewRow} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                নতুন আইটেম
              </Button>
            </div>

            {/* Header Row */}
            <div className="hidden md:grid md:grid-cols-12 gap-2 font-semibold text-sm pb-2 border-b">
              <div className="col-span-3">পণ্যের নাম</div>
              <div className="col-span-2">ক্যাটাগরি</div>
              <div className="col-span-2">পরিমাণ</div>
              <div className="col-span-2">একক</div>
              <div className="col-span-2">একক দাম</div>
              <div className="col-span-1">মোট</div>
            </div>

            {/* Item Rows */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-3 md:space-y-0">
                  <div className="flex items-center justify-between mb-2 md:hidden">
                    <span className="text-sm font-semibold">আইটেম #{index + 1}</span>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    {/* Item Name */}
                    <div className="md:col-span-3">
                      <Label className="md:hidden">পণ্যের নাম</Label>
                      <Input
                        placeholder="পণ্যের নাম"
                        value={item.item_name_bn}
                        onChange={(e) => updateItem(item.id, "item_name_bn", e.target.value)}
                      />
                    </div>

                    {/* Category */}
                    <div className="md:col-span-2">
                      <Label className="md:hidden">ক্যাটাগরি</Label>
                      <Select
                        value={item.category_id}
                        onValueChange={(value) => updateItem(item.id, "category_id", value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="ক্যাটাগরি" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name_bn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2">
                      <Label className="md:hidden">পরিমাণ</Label>
                      <Input
                        type="number"
                        placeholder="পরিমাণ"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                        step="0.01"
                      />
                    </div>

                    {/* Unit */}
                    <div className="md:col-span-2">
                      <Label className="md:hidden">একক</Label>
                      <Select
                        value={item.unit_id}
                        onValueChange={(value) => updateItem(item.id, "unit_id", value)}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="একক" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.name_bn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Unit Price */}
                    <div className="md:col-span-2">
                      <Label className="md:hidden">একক দাম</Label>
                      <Input
                        type="number"
                        placeholder="একক দাম"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, "unit_price", e.target.value)}
                        step="0.01"
                      />
                    </div>

                    {/* Total Price */}
                    <div className="md:col-span-1 flex items-center justify-between">
                      <div className="flex-1">
                        <Label className="md:hidden">মোট</Label>
                        <div className="text-sm font-semibold text-primary md:text-center">
                          ৳{item.total_price.toFixed(2)}
                        </div>
                      </div>
                      {items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(item.id)}
                          className="hidden md:flex"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Summary Card */}
        <Card className="p-4 bg-primary/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">মোট আইটেম</p>
              <p className="text-2xl font-bold">{totalItems}টি</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">সর্বমোট খরচ</p>
              <p className="text-2xl font-bold text-primary">৳{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          size="lg"
          disabled={loading}
        >
          {loading ? "সংরক্ষণ করা হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>

      <Navigation />
    </div>
  );
}
