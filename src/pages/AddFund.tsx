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
    if (!formData.amount) {
      toast({
        title: "ত্রুটি",
        description: "অনুগ্রহ করে পরিমাণ লিখুন",
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
        amount: parseFloat(formData.amount),
        source_note_bn: formData.source_note_bn || null,
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
          <h1 className="text-xl font-bold">জমা যোগ করুন</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">তারিখ</Label>
            <Input
              id="date"
              type="date"
              value={formData.fund_date}
              onChange={(e) => setFormData({ ...formData, fund_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">পরিমাণ *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="০.০০"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">উৎস / নোট</Label>
            <Input
              id="source"
              placeholder="যেমন: চাঁদা, দান"
              value={formData.source_note_bn}
              onChange={(e) => setFormData({ ...formData, source_note_bn: e.target.value })}
            />
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

export default AddFund;
