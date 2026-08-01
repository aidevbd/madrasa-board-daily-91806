import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { z } from "zod";

interface BulkExpenseItem {
  id: string;
  item_name_bn: string;
  quantity: string;
  unit_id: string;
  unit_price: string;
  total_price: number;
}

// Validation schema for bulk expense items
const bulkExpenseItemSchema = z.object({
  item_name_bn: z.string()
    .trim()
    .min(1, "আইটেমের নাম লিখুন")
    .max(200, "আইটেমের নাম সর্বোচ্চ ২০০ অক্ষরের হতে পারে"),
  quantity: z.string()
    .min(1, "পরিমাণ লিখুন")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "পরিমাণ শূন্যের বেশি হতে হবে"),
  unit_price: z.string()
    .min(1, "দাম লিখুন")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "সঠিক দাম লিখুন")
});

export default function BulkExpense() {
  const navigate = useNavigate();
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [items, setItems] = useState<BulkExpenseItem[]>([
    { id: crypto.randomUUID(), item_name_bn: "", quantity: "", unit_id: "", unit_price: "", total_price: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>("");

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

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("শুধুমাত্র ছবি আপলোড করুন");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারে");
      return;
    }

    setUploadingReceipt(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL for OCR
      const { data: signedData } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 3600);

      if (!signedData) throw new Error("Failed to get signed URL");

      const imageUrl = signedData.signedUrl;
      setReceiptImageUrl(imageUrl);
      setReceiptPreview(URL.createObjectURL(file));

      toast.success("রশিদ আপলোড হয়েছে");

      // Process OCR
      processReceiptOCR(imageUrl);
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("রশিদ আপলোড করতে সমস্যা হয়েছে");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const processReceiptOCR = async (imageUrl: string) => {
    setProcessingOCR(true);
    try {
      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: { imageUrl }
      });

      if (error) throw error;

      if (data.success && data.data) {
        const ocrData = data.data;
        
        // Auto-fill items with OCR data
        if (ocrData.items && ocrData.items.length > 0) {
          const newItems = ocrData.items.map((item: any) => ({
            id: crypto.randomUUID(),
            item_name_bn: item.name || "",
            quantity: item.quantity ? String(item.quantity) : "",
            unit_id: "",
            unit_price: item.price ? String(item.price) : "",
            total_price: item.price && item.quantity ? item.price * item.quantity : (item.price || 0)
          }));
          
          setItems(newItems);
        }
        
        // Set date if available
        if (ocrData.date) {
          setExpenseDate(ocrData.date);
        }

        toast.success("রশিদ থেকে তথ্য স্বয়ংক্রিয়ভাবে পূরণ করা হয়েছে");
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      toast.error("রশিদ থেকে তথ্য বের করতে সমস্যা হয়েছে");
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleSubmit = async () => {
    // Validate date
    if (!expenseDate) {
      toast.error("তারিখ নির্বাচন করুন");
      return;
    }

    // Validate and filter items
    const validItems: BulkExpenseItem[] = [];
    const errors: string[] = [];

    for (const item of items) {
      if (!item.item_name_bn.trim() && !item.quantity && !item.unit_price) {
        continue; // Skip empty rows
      }

      const validation = bulkExpenseItemSchema.safeParse({
        item_name_bn: item.item_name_bn,
        quantity: item.quantity,
        unit_price: item.unit_price
      });

      if (!validation.success) {
        const firstError = validation.error.errors[0];
        errors.push(`${item.item_name_bn || 'আইটেম'}: ${firstError.message}`);
      } else {
        validItems.push(item);
      }
    }

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    if (validItems.length === 0) {
      toast.error("অন্তত একটি আইটেম যোগ করুন");
      return;
    }

    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error("ইউজার খুঁজে পাওয়া যায়নি");
        return;
      }
      
      // Generate a batch_id to group all items together
      const batchId = crypto.randomUUID();
      
      const expensesToInsert = validItems.map(item => ({
        user_id: user.id,
        expense_date: expenseDate,
        item_name_bn: item.item_name_bn.trim(),
        category_id: categoryId || null,
        quantity: parseFloat(item.quantity),
        unit_id: item.unit_id || null,
        total_price: parseFloat(item.total_price.toFixed(2)),
        batch_id: batchId,
        receipt_image_url: receiptImageUrl || null
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
    <div className="min-h-screen bg-background pb-20 md:pb-24 lg:pb-28">
      <div className="bg-primary text-primary-foreground p-4 md:p-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">বাজারের তালিকা</h1>
      </div>

      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-4xl">
        <Card className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className="space-y-2 md:space-y-3">
            <Label className="text-sm md:text-base">তারিখ</Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>রশিদ আপলোড (ঐচ্ছিক)</Label>
            {processingOCR && (
              <div className="bg-primary/10 p-3 rounded-lg text-sm text-primary">
                🤖 OCR প্রসেসিং চলছে... রশিদ থেকে তথ্য বের করা হচ্ছে
              </div>
            )}
            {receiptPreview && (
              <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden mb-2">
                <img src={receiptPreview} alt="আপলোড করা রশিদের প্রিভিউ" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  aria-label="রশিদ মুছুন"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setReceiptPreview(null);
                    setReceiptImageUrl("");
                  }}
                >
                  মুছুন
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="bulk-receipt-camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptUpload}
                disabled={uploadingReceipt || processingOCR}
                className="hidden"
              />
              <Input
                id="bulk-receipt-gallery"
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                disabled={uploadingReceipt || processingOCR}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingReceipt || processingOCR}
                onClick={() => document.getElementById('bulk-receipt-camera')?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploadingReceipt ? "আপলোড হচ্ছে..." : "ক্যামারা"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={uploadingReceipt || processingOCR}
                onClick={() => document.getElementById('bulk-receipt-gallery')?.click()}
              >
                📁 গ্যালারি
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 রশিদ আপলোড করলে স্বয়ংক্রিয়ভাবে সব আইটেম পূরণ হবে
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-4">
            {/* Header Row */}
            <div className="hidden md:grid md:grid-cols-11 gap-2 font-semibold text-sm pb-2 border-b">
              <div className="col-span-4">পণ্যের নাম</div>
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

                  <div className="grid grid-cols-1 md:grid-cols-11 gap-2">
                    {/* Item Name */}
                    <div className="md:col-span-4">
                      <Label className="md:hidden">পণ্যের নাম</Label>
                      <Input
                        placeholder="পণ্যের নাম"
                        value={item.item_name_bn}
                        onChange={(e) => updateItem(item.id, "item_name_bn", e.target.value)}
                      />
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
                        min="0"
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
                        min="0"
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

        {/* Add New Item Button */}
        <div className="flex justify-center">
          <Button onClick={addNewRow} size="lg" variant="outline" className="w-full md:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            নতুন আইটেম যোগ করুন
          </Button>
        </div>

        {/* Summary Card with Category */}
        <Card className="p-4 bg-primary/5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ক্যাটাগরি (ঐচ্ছিক)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
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
            <div className="flex justify-between items-center pt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground">মোট আইটেম</p>
                <p className="text-2xl font-bold">{totalItems}টি</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">সর্বমোট খরচ</p>
                <p className="text-2xl font-bold text-primary">৳{totalAmount.toFixed(2)}</p>
              </div>
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
