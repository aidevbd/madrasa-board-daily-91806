import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Copy, Trash2, UserPlus, Crown, LogOut, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Family {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
}

interface FamilyMember {
  id: string;
  family_id: string;
  member_user_id: string;
  can_add: boolean;
  joined_at: string;
  profiles?: {
    email: string;
  };
}

const FamilySharing = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Check if user is a member of any family - using type assertion
      const { data: memberData } = await (supabase
        .from("family_members" as any)
        .select("*, families(*)")
        .eq("member_user_id", user.id)
        .single() as any);

      if (memberData && memberData.families) {
        const familyData = memberData.families as Family;
        setFamily(familyData);
        setIsOwner(familyData.owner_id === user.id);

        // Fetch all family members with profiles
        const { data: membersData } = await (supabase
          .from("family_members" as any)
          .select("*, profiles(email)")
          .eq("family_id", familyData.id) as any);

        if (membersData) {
          setMembers(membersData as FamilyMember[]);
        }
      }
    } catch (error) {
      console.error("Error fetching family data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createFamily = async () => {
    if (!newFamilyName.trim()) {
      toast({ title: "ত্রুটি", description: "পরিবারের নাম লিখুন", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate a unique 8-character invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data: familyData, error: familyError } = await (supabase
        .from("families" as any)
        .insert({
          name: newFamilyName.trim(),
          owner_id: user.id,
          invite_code: inviteCode,
        })
        .select()
        .single() as any);

      if (familyError) throw familyError;

      // Add owner as a member with add permission
      const { error: memberError } = await (supabase
        .from("family_members" as any)
        .insert({
          family_id: familyData.id,
          member_user_id: user.id,
          can_add: true,
        }) as any);

      if (memberError) throw memberError;

      toast({ title: "সফল", description: "পরিবার তৈরি হয়েছে" });
      setShowCreateDialog(false);
      setNewFamilyName("");
      fetchFamilyData();
    } catch (error: any) {
      console.error("Error creating family:", error);
      toast({ title: "ত্রুটি", description: error.message || "পরিবার তৈরিতে সমস্যা", variant: "destructive" });
    }
  };

  const joinFamily = async () => {
    if (!joinCode.trim()) {
      toast({ title: "ত্রুটি", description: "ইনভাইট কোড লিখুন", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find family by invite code
      const { data: familyData, error: findError } = await (supabase
        .from("families" as any)
        .select()
        .eq("invite_code", joinCode.trim().toUpperCase())
        .single() as any);

      if (findError || !familyData) {
        toast({ title: "ত্রুটি", description: "কোড সঠিক নয়", variant: "destructive" });
        return;
      }

      // Check if already a member
      const { data: existingMember } = await (supabase
        .from("family_members" as any)
        .select()
        .eq("family_id", familyData.id)
        .eq("member_user_id", user.id)
        .single() as any);

      if (existingMember) {
        toast({ title: "ত্রুটি", description: "আপনি ইতিমধ্যে এই পরিবারের সদস্য", variant: "destructive" });
        return;
      }

      const { error: memberError } = await (supabase
        .from("family_members" as any)
        .insert({
          family_id: familyData.id,
          member_user_id: user.id,
          can_add: false,
        }) as any);

      if (memberError) throw memberError;

      toast({ title: "সফল", description: "পরিবারে যোগ হয়েছেন" });
      setShowJoinDialog(false);
      setJoinCode("");
      fetchFamilyData();
    } catch (error: any) {
      console.error("Error joining family:", error);
      toast({ title: "ত্রুটি", description: error.message || "পরিবারে যোগ দিতে সমস্যা", variant: "destructive" });
    }
  };

  const leaveFamily = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !family) return;

      const { error } = await (supabase
        .from("family_members" as any)
        .delete()
        .eq("family_id", family.id)
        .eq("member_user_id", user.id) as any);

      if (error) throw error;

      toast({ title: "সফল", description: "পরিবার ছেড়ে দিয়েছেন" });
      setShowLeaveDialog(false);
      setFamily(null);
      setMembers([]);
      setIsOwner(false);
    } catch (error: any) {
      console.error("Error leaving family:", error);
      toast({ title: "ত্রুটি", description: error.message || "পরিবার ছাড়তে সমস্যা", variant: "destructive" });
    }
  };

  const deleteFamily = async () => {
    try {
      if (!family) return;

      const { error } = await (supabase
        .from("families" as any)
        .delete()
        .eq("id", family.id) as any);

      if (error) throw error;

      toast({ title: "সফল", description: "পরিবার মুছে ফেলা হয়েছে" });
      setShowDeleteDialog(false);
      setFamily(null);
      setMembers([]);
      setIsOwner(false);
    } catch (error: any) {
      console.error("Error deleting family:", error);
      toast({ title: "ত্রুটি", description: error.message || "পরিবার মুছতে সমস্যা", variant: "destructive" });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await (supabase
        .from("family_members" as any)
        .delete()
        .eq("id", memberId) as any);

      if (error) throw error;

      toast({ title: "সফল", description: "সদস্য সরিয়ে দেওয়া হয়েছে" });
      fetchFamilyData();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({ title: "ত্রুটি", description: error.message || "সদস্য সরাতে সমস্যা", variant: "destructive" });
    }
  };

  const toggleMemberPermission = async (memberId: string, currentCanAdd: boolean) => {
    try {
      const { error } = await (supabase
        .from("family_members" as any)
        .update({ can_add: !currentCanAdd })
        .eq("id", memberId) as any);

      if (error) throw error;

      toast({ title: "সফল", description: "অনুমতি পরিবর্তন হয়েছে" });
      fetchFamilyData();
    } catch (error: any) {
      console.error("Error toggling permission:", error);
      toast({ title: "ত্রুটি", description: error.message || "অনুমতি পরিবর্তনে সমস্যা", variant: "destructive" });
    }
  };

  const copyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
      setCodeCopied(true);
      toast({ title: "কপি হয়েছে", description: "ইনভাইট কোড কপি করা হয়েছে" });
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  if (loading) {
    return <Card className="p-4 md:p-6"><p className="text-muted-foreground">লোড হচ্ছে...</p></Card>;
  }

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        <h3 className="font-semibold text-sm md:text-base lg:text-lg">ফ্যামিলি শেয়ারিং</h3>
      </div>

      {!family ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            পরিবারের সদস্যদের সাথে খরচ ও জমার তথ্য শেয়ার করুন
          </p>
          
          <div className="flex gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1 h-10 md:h-12">
                  <Plus className="h-4 w-4 mr-2" />
                  পরিবার তৈরি করুন
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>নতুন পরিবার তৈরি করুন</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>পরিবারের নাম</Label>
                    <Input
                      placeholder="যেমন: আমার পরিবার"
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                    />
                  </div>
                  <Button onClick={createFamily} className="w-full">
                    তৈরি করুন
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 h-10 md:h-12">
                  <UserPlus className="h-4 w-4 mr-2" />
                  যোগ দিন
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>পরিবারে যোগ দিন</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>ইনভাইট কোড</Label>
                    <Input
                      placeholder="কোড লিখুন"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={8}
                    />
                  </div>
                  <Button onClick={joinFamily} className="w-full">
                    যোগ দিন
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-base md:text-lg">{family.name}</h4>
              <p className="text-xs text-muted-foreground">{members.length} জন সদস্য</p>
            </div>
            {isOwner && (
              <Badge className="bg-amber-500 text-white">
                <Crown className="h-3 w-3 mr-1" />
                মালিক
              </Badge>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">ইনভাইট কোড:</span>
              <code className="bg-background px-2 py-1 rounded text-sm font-mono flex-1">
                {family.invite_code}
              </code>
              <Button variant="ghost" size="icon" onClick={copyInviteCode}>
                {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">সদস্যদের তালিকা</Label>
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.profiles?.email || "অজানা"}
                      {member.member_user_id === family.owner_id && (
                        <Crown className="inline h-3 w-3 ml-1 text-amber-500" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.can_add ? "খরচ যোগ করতে পারে" : "শুধু দেখতে পারে"}
                    </p>
                  </div>
                </div>

                {isOwner && member.member_user_id !== userId && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={member.can_add}
                      onCheckedChange={() => toggleMemberPermission(member.id, member.can_add)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMember(member.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            {isOwner ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                পরিবার মুছে ফেলুন
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowLeaveDialog(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                পরিবার ছেড়ে দিন
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Leave Family Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>পরিবার ছেড়ে দিতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি আর এই পরিবারের খরচ ও জমা দেখতে পারবেন না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={leaveFamily}>ছেড়ে দিন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Family Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>পরিবার মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              এটি সম্পূর্ণ পরিবার এবং সব সদস্যদের সরিয়ে দেবে। এই কাজটি পুনরায় ফিরিয়ে আনা যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFamily} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default FamilySharing;
