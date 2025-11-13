import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, LogOut } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

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
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newFavorite, setNewFavorite] = useState({ name: "", categoryId: "" });

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

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <h1 className="text-xl font-bold">সেটিংস</h1>
      </div>

      <div className="p-4 space-y-4">
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">ক্যাটাগরি</TabsTrigger>
            <TabsTrigger value="units">একক</TabsTrigger>
            <TabsTrigger value="favorites">প্রিয়</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <Card className="p-4 space-y-3">
              <Label>নতুন ক্যাটাগরি যোগ করুন</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="ক্যাটাগরির নাম"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button onClick={addCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span>{cat.name_bn}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCategory(cat.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="units" className="space-y-4">
            <Card className="p-4 space-y-3">
              <Label>নতুন একক যোগ করুন</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="একক নাম (যেমন: কেজি, লিটার)"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                />
                <Button onClick={addUnit}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              {units.map((unit) => (
                <div key={unit.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span>{unit.name_bn}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteUnit(unit.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <Card className="p-4 space-y-3">
              <Label>নতুন প্রিয় আইটেম যোগ করুন</Label>
              <Input
                placeholder="আইটেমের নাম"
                value={newFavorite.name}
                onChange={(e) => setNewFavorite({ ...newFavorite, name: e.target.value })}
              />
              <Button onClick={addFavorite} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                যোগ করুন
              </Button>
            </Card>

            <Card className="p-4 space-y-2">
              {favorites.map((fav) => (
                <div key={fav.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{fav.item_name_bn}</p>
                    {fav.expense_categories && (
                      <p className="text-xs text-muted-foreground">{fav.expense_categories.name_bn}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFavorite(fav.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          লগ আউট
        </Button>
      </div>

      <Navigation />
    </div>
  );
};

export default Settings;
