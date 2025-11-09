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
      const { error: uploadError, data } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      setFormData({ ...formData, receipt_image_url: publicUrl });
      setReceiptPreview(URL.createObjectURL(file));

      toast({
        title: "সফল",
        description: "রশিদ আপলোড হয়েছে",
      });
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

  const handleSubmit = async (saveAndNew: boolean) => {
    if (!formData.item_name_bn || !formData.total_price) {
      toast({
        title: "ত্রুটি",
        description: "অনুগ্রহ করে আইটেম নাম এবং মূল্য লিখুন",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        expense_date: formData.expense_date,
        item_name_bn: formData.item_name_bn,
        category_id: formData.category_id || null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        unit_id: formData.unit_id || null,
        total_price: parseFloat(formData.total_price),
        notes: formData.notes || null,
        receipt_image_url: formData.receipt_image_url || null,
      });

      if (error) throw error;

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
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">খরচ যুক্ত করুন</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {favorites.length > 0 && (
          <Card className="p-4">
            <Label className="text-sm font-semibold mb-3 block">প্রিয় আইটেম</Label>
            <div className="flex flex-wrap gap-2">
              {favorites.map((fav) => (
                <Button
                  key={fav.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFavoriteSelect(fav)}
                  className="text-sm"
                >
                  {fav.item_name_bn}
                </Button>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">তারিখ</Label>
            <Input
              id="date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item">আইটেমের নাম *</Label>
            <Input
              id="item"
              placeholder="যেমন: আলু, পেঁয়াজ"
              value={formData.item_name_bn}
              onChange={(e) => setFormData({ ...formData, item_name_bn: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">ক্যাটাগরি</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="ক্যাটাগরি নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">পরিমাণ</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">একক</Label>
              <Select value={formData.unit_id} onValueChange={(value) => setFormData({ ...formData, unit_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="একক" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name_bn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">মোট মূল্য *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              placeholder="০.০০"
              value={formData.total_price}
              onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">নোট</Label>
            <Input
              id="notes"
              placeholder="অতিরিক্ত তথ্য"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">রশিদ আপলোড</Label>
            {receiptPreview && (
              <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden mb-2">
                <img src={receiptPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
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
            <div className="flex gap-2">
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptUpload}
                disabled={uploadingReceipt}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={uploadingReceipt}
                onClick={() => document.getElementById('receipt')?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                {uploadingReceipt ? "আপলোড হচ্ছে..." : "ছবি তুলুন"}
              </Button>
            </div>
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
