import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schemas
const authSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "ইমেইল লিখুন")
    .email("সঠিক ইমেইল লিখুন")
    .max(255, "ইমেইল সর্বোচ্চ ২৫৫ অক্ষরের হতে পারে"),
  password: z.string()
    .min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে")
    .max(100, "পাসওয়ার্ড সর্বোচ্চ ১০০ অক্ষরের হতে পারে")
});

const emailSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "ইমেইল লিখুন")
    .email("সঠিক ইমেইল লিখুন")
    .max(255, "ইমেইল সর্বোচ্চ ২৫৫ অক্ষরের হতে পারে")
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAuth = async () => {
    // Validate input
    const validation = authSchema.safeParse({ email: email.trim(), password });
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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error("এই ইমেইল ইতিমধ্যে নিবন্ধিত আছে");
          }
          throw error;
        }
        
        // Auto-login after signup (since email confirmation is disabled)
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        
        toast({
          title: "সফল",
          description: "অ্যাকাউন্ট তৈরি হয়েছে!",
        });
        navigate("/");
      }
    } catch (error: any) {
      let errorMessage = "সমস্যা হয়েছে";
      
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "ভুল ইমেইল বা পাসওয়ার্ড";
      } else if (error.message.includes("already registered")) {
        errorMessage = "এই ইমেইল ইতিমধ্যে নিবন্ধিত আছে";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "ইমেইল নিশ্চিত করুন";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "ত্রুটি",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    // Validate email
    const validation = emailSchema.safeParse({ email: email.trim() });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-muted/30 p-4 md:p-6 lg:p-8">
      <Card className="w-full max-w-md md:max-w-lg p-6 md:p-8 space-y-6 md:space-y-8">
        <div className="text-center space-y-2 md:space-y-3">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary">দৈনিক বোর্ডিং ম্যানেজার</h1>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">আপনার বোর্ডিং পরিচালনা সহজ করুন</p>
        </div>

        {showForgotPassword ? (
          <div className="space-y-4 md:space-y-5">
            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="reset-email" className="text-sm md:text-base">ইমেইল</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 md:h-12 text-sm md:text-base"
              />
            </div>
            <Button onClick={handleForgotPassword} disabled={loading} className="w-full h-10 md:h-12 text-sm md:text-base">
              পাসওয়ার্ড রিসেট লিংক পাঠান
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowForgotPassword(false)}
              className="w-full h-10 md:h-12 text-sm md:text-base"
            >
              ফিরে যান
            </Button>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-5">
            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="email" className="text-sm md:text-base">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 md:h-12 text-sm md:text-base"
              />
            </div>

            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="password" className="text-sm md:text-base">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 md:h-12 text-sm md:text-base"
              />
            </div>

            <Button onClick={handleAuth} disabled={loading} className="w-full h-10 md:h-12 text-sm md:text-base">
              {isLogin ? "লগ ইন" : "সাইন আপ"}
            </Button>

            {isLogin && (
              <Button
                variant="link"
                onClick={() => setShowForgotPassword(true)}
                className="w-full text-sm md:text-base"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </Button>
            )}

            <div className="text-center text-sm md:text-base">
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
