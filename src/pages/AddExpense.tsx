import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Save } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import TagManager from "@/components/TagManager";

// Validation schema
const expenseSchema = z.object({
  item_name_bn: z.string()
    .trim()
    .min(1, "আইটেমের নাম লিখুন")
    .max(200, "আইটেমের নাম সর্বোচ্চ ২০০ অক্ষরের হতে পারে"),
  total_price: z.string()
    .min(1, "মূল্য লিখুন")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, "সঠিক মূল্য লিখুন"),
  quantity: z.string()
    .optional()
    .refine((val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), "পরিমাণ শূন্যের বেশি হতে হবে"),
  notes: z.string()
    .max(1000, "নোট সর্বোচ্চ ১০০০ অক্ষরের হতে পারে")
    .optional()
});

const AddExpense = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    item_name_bn: "",
    category_id: "",
    quantity: "",
    unit_id: "",
    total_price: "",
    notes: "",
    receipt_image_url: "",
  });
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [categoriesRes, unitsRes, favoritesRes] = await Promise.all([
        supabase.from("expense_categories").select("*").order("name_bn"),
        supabase.from("units").select("*").order("name_bn"),
        supabase.from("favorites").select("*, expense_categories(name_bn)").eq("user_id", user.id).order("display_order"),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (unitsRes.data) setUnits(unitsRes.data);
      if (favoritesRes.data) setFavorites(favoritesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleFavoriteSelect = (favorite: any) => {
    setFormData({
      ...formData,
      item_name_bn: favorite.item_name_bn,
      category_id: favorite.category_id || "",
      quantity: favorite.default_qty ? String(favorite.default_qty) : "",
      unit_id: favorite.default_unit_id || "",
    });
  };

  const [processingOCR, setProcessingOCR] = useState(false);

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "ত্রুটি",
        description: "শুধুমাত্র ছবি আপলোড করুন",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ত্রুটি",
        description: "ছবির সাইজ সর্বোচ্চ ৫ MB হতে পারে",
        variant: "destructive",
      });
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
      setFormData({ ...formData, receipt_image_url: imageUrl });
      setReceiptPreview(URL.createObjectURL(file));

      toast({
        title: "সফল",
        description: "রশিদ আপলোড হয়েছে",
      });

      // Process OCR
      processReceiptOCR(imageUrl);
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast({
        title: "ত্রুটি",
        description: "রশিদ আপলোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
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
        
        // Auto-fill form with OCR data
        const updates: any = {};
        
        if (ocrData.total) {
          updates.total_price = String(ocrData.total);
        }
        
        if (ocrData.date) {
          updates.expense_date = ocrData.date;
        }
        
        // If there's only one item, use it
        if (ocrData.items && ocrData.items.length === 1) {
          const item = ocrData.items[0];
          updates.item_name_bn = item.name;
          if (item.quantity) {
            updates.quantity = String(item.quantity);
          }
          if (item.price) {
            updates.total_price = String(item.price);
          }
        } else if (ocrData.items && ocrData.items.length > 1) {
          // Multiple items found - suggest user to use bulk expense
          toast({
            title: "একাধিক আইটেম পাওয়া গেছে",
            description: "বাজারের তালিকা পেজ ব্যবহার করুন একাধিক আইটেমের জন্য",
          });
        }
        
        if (ocrData.shop) {
          updates.notes = ocrData.shop;
        }

        setFormData(prev => ({ ...prev, ...updates }));

        toast({
          title: "OCR সফল",
          description: "রশিদ থেকে তথ্য স্বয়ংক্রিয়ভাবে পূরণ করা হয়েছে",
        });
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      toast({
        title: "OCR ত্রুটি",
        description: "রশিদ থেকে তথ্য বের করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setProcessingOCR(false);
    }
  };

  const handleSubmit = async (saveAndNew: boolean) => {
    // Validate input
    const validation = expenseSchema.safeParse({
      item_name_bn: formData.item_name_bn,
      total_price: formData.total_price,
      quantity: formData.quantity,
      notes: formData.notes
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "ত্রুটি",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data: expense, error } = await supabase.from("expenses").insert({
        user_id: user.id,
        expense_date: formData.expense_date,
        item_name_bn: formData.item_name_bn.trim(),
        category_id: formData.category_id || null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        unit_id: formData.unit_id || null,
        total_price: parseFloat(parseFloat(formData.total_price).toFixed(2)),
        notes: formData.notes?.trim() || null,
        receipt_image_url: formData.receipt_image_url || null,
      }).select().single();

      if (error) throw error;

      // Save tag relations
      if (selectedTags.length > 0 && expense) {
        const tagRelations = selectedTags.map(tagId => ({
          expense_id: expense.id,
          tag_id: tagId,
        }));
        await supabase.from("expense_tag_relations").insert(tagRelations);
      }

      toast({
        title: "সফল",
        description: "খরচ সংরক্ষিত হয়েছে",
      });

      if (saveAndNew) {
        setFormData({
          expense_date: new Date().toISOString().split("T")[0],
          item_name_bn: "",
          category_id: "",
          quantity: "",
          unit_id: "",
          total_price: "",
          notes: "",
          receipt_image_url: "",
        });
        setReceiptPreview(null);
        setSelectedTags([]);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "ত্রুটি",
        description: "খরচ সংরক্ষণে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-28 lg:pb-32">
      <div className="bg-primary text-primary-foreground p-4 md:p-6 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3 md:gap-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">খরচ যুক্ত করুন</h1>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-2xl mx-auto">
        {favorites.length > 0 && (
          <Card className="p-4 md:p-6">
            <Label className="text-sm md:text-base font-semibold mb-3 md:mb-4 block">প্রিয় আইটেম</Label>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {favorites.map((fav) => (
                <Button
                  key={fav.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFavoriteSelect(fav)}
                  className="text-sm md:text-base h-9 md:h-10"
                >
                  {fav.item_name_bn}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="date" className="text-sm md:text-base">তারিখ</Label>
            <Input
              id="date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="item" className="text-sm md:text-base">আইটেমের নাম *</Label>
            <Input
              id="item"
              placeholder="যেমন: আলু, পেঁয়াজ"
              value={formData.item_name_bn}
              onChange={(e) => setFormData({ ...formData, item_name_bn: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="category" className="text-sm md:text-base">ক্যাটাগরি</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
              <SelectTrigger className="h-10 md:h-12 text-sm md:text-base">
                <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-sm md:text-base">
                    {cat.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="quantity" className="text-sm md:text-base">পরিমাণ</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="h-10 md:h-12 text-sm md:text-base"
              />
            </div>

            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="unit" className="text-sm md:text-base">একক</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value })}>
                <SelectTrigger className="h-10 md:h-12 text-sm md:text-base">
                  <SelectValue placeholder="একক" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="text-sm md:text-base">
                      {unit.name_bn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="price" className="text-sm md:text-base">মোট মূল্য *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="০.০০"
              value={formData.total_price}
              onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="notes" className="text-sm md:text-base">নোট</Label>
            <Input
              id="notes"
              placeholder="অতিরিক্ত তথ্য"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label className="text-sm md:text-base">ট্যাগ</Label>
            <TagManager
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">রশিদ আপলোড</Label>
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
                    setFormData({ ...formData, receipt_image_url: "" });
                  }}
                >
                  মুছুন
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="receipt-camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptUpload}
                disabled={uploadingReceipt || processingOCR}
                className="hidden"
              />
              <Input
                id="receipt-gallery"
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
                onClick={() => document.getElementById('receipt-camera')?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploadingReceipt ? "আপলোড হচ্ছে..." : "ক্যামারা"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={uploadingReceipt || processingOCR}
                onClick={() => document.getElementById('receipt-gallery')?.click()}
              >
                📁 গ্যালারি
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 রশিদ আপলোড করলে স্বয়ংক্রিয়ভাবে তথ্য পূরণ হবে
            </p>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex-1"
            size="lg"
          >
            <Save className="mr-2 h-4 w-4" />
            সেভ করুন
          </Button>

          <Button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            variant="secondary"
            className="flex-1"
            size="lg"
          >
            সেভ ও নতুন
          </Button>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default AddExpense;
