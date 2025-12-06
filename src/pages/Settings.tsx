import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, LogOut, Moon, Sun, Download, DollarSign, Pencil, Settings2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useTheme } from "@/hooks/useTheme";
import { useEditMode } from "@/hooks/useEditMode";
import EditItemDialog from "@/components/EditItemDialog";
import { Switch } from "@/components/ui/switch";
import FamilySharing from "@/components/FamilySharing";

// Validation schemas
const nameSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "নাম লিখুন")
    .max(100, "নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে")
});

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { isEditMode, toggleEditMode } = useEditMode();
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newFavorite, setNewFavorite] = useState({ name: "", categoryId: "" });
  
  // Edit dialog states
  const [editCategory, setEditCategory] = useState<any | null>(null);
  const [editUnit, setEditUnit] = useState<any | null>(null);
  const [editFavorite, setEditFavorite] = useState<any | null>(null);

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

  const addCategory = async () => {
    // Validate input
    const validation = nameSchema.safeParse({ name: newCategory });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: "ত্রুটি", description: firstError.message, variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("expense_categories").insert({
        user_id: user.id,
        name: newCategory.trim(),
        name_bn: newCategory.trim(),
      });

      if (error) {
        if (error.message.includes("permission")) {
          throw new Error("শুধুমাত্র এডমিন ক্যাটাগরি যোগ করতে পারবে");
        }
        throw error;
      }

      toast({ title: "সফল", description: "ক্যাটাগরি যোগ হয়েছে" });
      setNewCategory("");
      fetchData();
    } catch (error: any) {
      console.error("Error adding category:", error);
      toast({ 
        title: "ত্রুটি", 
        description: error.message || "ক্যাটাগরি যোগে সমস্যা", 
        variant: "destructive" 
      });
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      
      if (error) {
        if (error.message.includes("permission")) {
          throw new Error("শুধুমাত্র এডমিন ক্যাটাগরি মুছতে পারবে");
        }
        throw error;
      }

      toast({ title: "সফল", description: "ক্যাটাগরি মুছে ফেলা হয়েছে" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({ 
        title: "ত্রুটি", 
        description: error.message || "ক্যাটাগরি মুছতে সমস্যা", 
        variant: "destructive" 
      });
    }
  };

  const addUnit = async () => {
    // Validate input
    const validation = nameSchema.safeParse({ name: newUnit });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: "ত্রুটি", description: firstError.message, variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("units").insert({
        user_id: user.id,
        name: newUnit.trim(),
        name_bn: newUnit.trim(),
      });

      if (error) {
        if (error.message.includes("permission")) {
          throw new Error("শুধুমাত্র এডমিন একক যোগ করতে পারবে");
        }
        throw error;
      }

      toast({ title: "সফল", description: "একক যোগ হয়েছে" });
      setNewUnit("");
      fetchData();
    } catch (error: any) {
      console.error("Error adding unit:", error);
      toast({ 
        title: "ত্রুটি", 
        description: error.message || "একক যোগে সমস্যা", 
        variant: "destructive" 
      });
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      const { error } = await supabase.from("units").delete().eq("id", id);
      
      if (error) {
        if (error.message.includes("permission")) {
          throw new Error("শুধুমাত্র এডমিন একক মুছতে পারবে");
        }
        throw error;
      }

      toast({ title: "সফল", description: "একক মুছে ফেলা হয়েছে" });
      fetchData();
    } catch (error: any) {
      console.error("Error deleting unit:", error);
      toast({ 
        title: "ত্রুটি", 
        description: error.message || "একক মুছতে সমস্যা", 
        variant: "destructive" 
      });
    }
  };

  const addFavorite = async () => {
    // Validate input
    const validation = nameSchema.safeParse({ name: newFavorite.name });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({ title: "ত্রুটি", description: firstError.message, variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        item_name_bn: newFavorite.name.trim(),
        category_id: newFavorite.categoryId || null,
        display_order: favorites.length,
      });

      if (error) throw error;

      toast({ title: "সফল", description: "প্রিয় আইটেম যোগ হয়েছে" });
      setNewFavorite({ name: "", categoryId: "" });
      fetchData();
    } catch (error) {
      console.error("Error adding favorite:", error);
      toast({ title: "ত্রুটি", description: "প্রিয় আইটেম যোগে সমস্যা", variant: "destructive" });
    }
  };

  const deleteFavorite = async (id: string) => {
    try {
      const { error } = await supabase.from("favorites").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "সফল", description: "প্রিয় আইটেম মুছে ফেলা হয়েছে" });
      fetchData();
    } catch (error) {
      console.error("Error deleting favorite:", error);
      toast({ title: "ত্রুটি", description: "প্রিয় আইটেম মুছতে সমস্যা", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleBackupDownload = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [expensesRes, fundsRes, categoriesRes, unitsRes, favoritesRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("user_id", user.id),
        supabase.from("funds").select("*").eq("user_id", user.id),
        supabase.from("expense_categories").select("*").eq("user_id", user.id),
        supabase.from("units").select("*").eq("user_id", user.id),
        supabase.from("favorites").select("*").eq("user_id", user.id)
      ]);

      const backupData = {
        expenses: expensesRes.data || [],
        funds: fundsRes.data || [],
        categories: categoriesRes.data || [],
        units: unitsRes.data || [],
        favorites: favoritesRes.data || [],
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily-boarding-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "সফল", description: "ব্যাকআপ ডাউনলোড হয়েছে" });
    } catch (error) {
      console.error("Error downloading backup:", error);
      toast({ title: "ত্রুটি", description: "ব্যাকআপ ডাউনলোডে সমস্যা", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24 md:pb-28 lg:pb-32">
      <div className="bg-primary text-primary-foreground p-4 md:p-6 shadow-md">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold max-w-4xl mx-auto">সেটিংস</h1>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-4xl mx-auto">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10 md:h-12">
            <TabsTrigger value="categories" className="text-sm md:text-base">ক্যাটাগরি</TabsTrigger>
            <TabsTrigger value="units" className="text-sm md:text-base">একক</TabsTrigger>
            <TabsTrigger value="favorites" className="text-sm md:text-base">প্রিয়</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4 md:space-y-5">
            <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
              <Label className="text-sm md:text-base">নতুন ক্যাটাগরি যোগ করুন</Label>
              <div className="flex gap-2 md:gap-3">
                <Input
                  placeholder="ক্যাটাগরির নাম"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
                <Button onClick={addCategory} className="h-10 md:h-12 w-10 md:w-12">
                  <Plus className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </Card>

            <Card className="p-4 md:p-6 space-y-2 md:space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="flex justify-between items-center py-2 md:py-3 border-b last:border-0">
                  <span className="text-sm md:text-base lg:text-lg">{cat.name_bn}</span>
                  <div className="flex gap-1">
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditCategory(cat)}
                      >
                        <Pencil className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCategory(cat.id)}
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="units" className="space-y-4 md:space-y-5">
            <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
              <Label className="text-sm md:text-base">নতুন একক যোগ করুন</Label>
              <div className="flex gap-2 md:gap-3">
                <Input
                  placeholder="একক নাম (যেমন: কেজি, লিটার)"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="h-10 md:h-12 text-sm md:text-base"
                />
                <Button onClick={addUnit} className="h-10 md:h-12 w-10 md:w-12">
                  <Plus className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </Card>

            <Card className="p-4 md:p-6 space-y-2 md:space-y-3">
              {units.map((unit) => (
                <div key={unit.id} className="flex justify-between items-center py-2 md:py-3 border-b last:border-0">
                  <span className="text-sm md:text-base lg:text-lg">{unit.name_bn}</span>
                  <div className="flex gap-1">
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditUnit(unit)}
                      >
                        <Pencil className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteUnit(unit.id)}
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 md:space-y-5">
            <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
              <Label className="text-sm md:text-base">নতুন প্রিয় আইটেম যোগ করুন</Label>
              <Input
                placeholder="আইটেমের নাম"
                value={newFavorite.name}
                onChange={(e) => setNewFavorite({ ...newFavorite, name: e.target.value })}
                className="h-10 md:h-12 text-sm md:text-base"
              />
              <Button onClick={addFavorite} className="w-full h-10 md:h-12 text-sm md:text-base">
                <Plus className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                যোগ করুন
              </Button>
            </Card>

            <Card className="p-4 md:p-6 space-y-2 md:space-y-3">
              {favorites.map((fav) => (
                <div key={fav.id} className="flex justify-between items-center py-2 md:py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm md:text-base lg:text-lg">{fav.item_name_bn}</p>
                    {fav.expense_categories && (
                      <p className="text-xs md:text-sm text-muted-foreground">{fav.expense_categories.name_bn}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditFavorite(fav)}
                      >
                        <Pencil className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFavorite(fav.id)}
                    >
                      <Trash2 className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>

        <Card className={`p-4 md:p-6 space-y-4 ${isEditMode ? 'border-2 border-primary ring-2 ring-primary/20' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm md:text-base lg:text-lg">এডিট মোড</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                {isEditMode ? "এডিট মোড চালু - সব জায়গায় এডিট করুন" : "এডিট করতে চালু করুন"}
              </p>
            </div>
            <Switch
              checked={isEditMode}
              onCheckedChange={toggleEditMode}
              className="scale-110 md:scale-125"
            />
          </div>
        </Card>

        <Card className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm md:text-base lg:text-lg">বাজেট</h3>
              <p className="text-xs md:text-sm text-muted-foreground">মাসিক বাজেট ম্যানেজ করুন</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigate("/budget")} className="h-10 w-10 md:h-12 md:w-12">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </Card>

        <FamilySharing />

        <Card className="p-4 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm md:text-base lg:text-lg">ডার্ক মোড</h3>
              <p className="text-xs md:text-sm text-muted-foreground">থিম পরিবর্তন করুন</p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme} className="h-10 w-10 md:h-12 md:w-12">
              {theme === "dark" ? <Sun className="h-4 w-4 md:h-5 md:w-5" /> : <Moon className="h-4 w-4 md:h-5 md:w-5" />}
            </Button>
          </div>
        </Card>

        <Button variant="outline" className="w-full h-12 md:h-14 text-sm md:text-base" onClick={handleBackupDownload}>
          <Download className="mr-2 h-4 w-4 md:h-5 md:w-5" />
          ডেটা ব্যাকআপ ডাউনলোড করুন
        </Button>

        <Button
          variant="destructive"
          className="w-full h-12 md:h-14 text-sm md:text-base"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4 md:h-5 md:w-5" />
          লগ আউট
        </Button>
      </div>

      {/* Edit Dialogs */}
      {editCategory && (
        <EditItemDialog
          open={!!editCategory}
          onOpenChange={(open) => !open && setEditCategory(null)}
          title="ক্যাটাগরি এডিট করুন"
          fields={[
            { name: "name_bn", label: "ক্যাটাগরির নাম", value: editCategory.name_bn, type: "text" }
          ]}
          onSave={async (values) => {
            const nameBn = String(values.name_bn);
            const { error } = await supabase
              .from("expense_categories")
              .update({ name_bn: nameBn, name: nameBn })
              .eq("id", editCategory.id);
            if (error) throw error;
            toast({ title: "সফল", description: "ক্যাটাগরি আপডেট হয়েছে" });
            fetchData();
          }}
        />
      )}

      {editUnit && (
        <EditItemDialog
          open={!!editUnit}
          onOpenChange={(open) => !open && setEditUnit(null)}
          title="একক এডিট করুন"
          fields={[
            { name: "name_bn", label: "একক নাম", value: editUnit.name_bn, type: "text" }
          ]}
          onSave={async (values) => {
            const nameBn = String(values.name_bn);
            const { error } = await supabase
              .from("units")
              .update({ name_bn: nameBn, name: nameBn })
              .eq("id", editUnit.id);
            if (error) throw error;
            toast({ title: "সফল", description: "একক আপডেট হয়েছে" });
            fetchData();
          }}
        />
      )}

      {editFavorite && (
        <EditItemDialog
          open={!!editFavorite}
          onOpenChange={(open) => !open && setEditFavorite(null)}
          title="প্রিয় আইটেম এডিট করুন"
          fields={[
            { name: "item_name_bn", label: "আইটেমের নাম", value: editFavorite.item_name_bn, type: "text" }
          ]}
          onSave={async (values) => {
            const { error } = await supabase
              .from("favorites")
              .update({ item_name_bn: String(values.item_name_bn) })
              .eq("id", editFavorite.id);
            if (error) throw error;
            toast({ title: "সফল", description: "প্রিয় আইটেম আপডেট হয়েছে" });
            fetchData();
          }}
        />
      )}

      <Navigation />
    </div>
  );
};

export default Settings;
