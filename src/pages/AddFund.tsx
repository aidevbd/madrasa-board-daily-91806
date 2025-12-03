import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schema
const fundSchema = z.object({
  amount: z.string()
    .min(1, "পরিমাণ লিখুন")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "পরিমাণ শূন্যের বেশি হতে হবে"),
  source_note_bn: z.string()
    .max(500, "নোট সর্বোচ্চ ৫০০ অক্ষরের হতে পারে")
    .optional()
});

const AddFund = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fund_date: new Date().toISOString().split("T")[0],
    amount: "",
    source_note_bn: "",
  });

  const handleSubmit = async (saveAndNew: boolean) => {
    // Validate input
    const validation = fundSchema.safeParse({
      amount: formData.amount,
      source_note_bn: formData.source_note_bn
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

      const { error } = await supabase.from("funds").insert({
        user_id: user.id,
        fund_date: formData.fund_date,
        amount: parseFloat(parseFloat(formData.amount).toFixed(2)),
        source_note_bn: formData.source_note_bn?.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "সফল",
        description: "জমা সংরক্ষিত হয়েছে",
      });

      if (saveAndNew) {
        setFormData({
          fund_date: new Date().toISOString().split("T")[0],
          amount: "",
          source_note_bn: "",
        });
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Error saving fund:", error);
      toast({
        title: "ত্রুটি",
        description: "জমা সংরক্ষণে সমস্যা হয়েছে",
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
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">জমা যোগ করুন</h1>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-2xl mx-auto">
        <Card className="p-4 md:p-6 space-y-4 md:space-y-5">
          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="date" className="text-sm md:text-base">তারিখ</Label>
            <Input
              id="date"
              type="date"
              value={formData.fund_date}
              onChange={(e) => setFormData({ ...formData, fund_date: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="amount" className="text-sm md:text-base">পরিমাণ *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="০.০০"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>

          <div className="space-y-2 md:space-y-3">
            <Label htmlFor="source" className="text-sm md:text-base">উৎস / নোট</Label>
            <Input
              id="source"
              placeholder="যেমন: চাঁদা, দান"
              value={formData.source_note_bn}
              onChange={(e) => setFormData({ ...formData, source_note_bn: e.target.value })}
              className="h-10 md:h-12 text-sm md:text-base"
            />
          </div>
        </Card>

        <div className="flex gap-3 md:gap-4">
          <Button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="flex-1 h-12 md:h-14 text-sm md:text-base"
            size="lg"
          >
            <Save className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            সেভ করুন
          </Button>

          <Button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            variant="secondary"
            className="flex-1 h-12 md:h-14 text-sm md:text-base"
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

export default AddFund;
