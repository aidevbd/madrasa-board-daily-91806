import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      toast({
        title: "ত্রুটি",
        description: "ইমেইল এবং পাসওয়ার্ড লিখুন",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({
          title: "সফল",
          description: "অ্যাকাউন্ট তৈরি হয়েছে! এখন লগ ইন করুন",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "ত্রুটি",
        description: error.message || "সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "ত্রুটি",
        description: "ইমেইল লিখুন",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast({
        title: "সফল",
        description: "পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে",
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "ত্রুটি",
        description: error.message || "সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-muted/30 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">দৈনিক বোর্ডিং ম্যানেজার</h1>
          <p className="text-muted-foreground">আপনার বোর্ডিং পরিচালনা সহজ করুন</p>
        </div>

        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">ইমেইল</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleForgotPassword} disabled={loading} className="w-full">
              পাসওয়ার্ড রিসেট লিংক পাঠান
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForgotPassword(false)}
              className="w-full"
            >
              ফিরে যান
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button onClick={handleAuth} disabled={loading} className="w-full">
              {isLogin ? "লগ ইন" : "সাইন আপ"}
            </Button>

            {isLogin && (
              <Button
                variant="link"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-sm"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </Button>
            )}

            <div className="text-center text-sm">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline"
              >
                {isLogin ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "আগে থেকে অ্যাকাউন্ট আছে? লগ ইন করুন"}
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Auth;
