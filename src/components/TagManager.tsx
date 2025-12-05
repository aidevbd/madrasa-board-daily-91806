import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, X, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tag {
  id: string;
  name_bn: string;
  color: string;
}

interface TagManagerProps {
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
  expenseId?: string;
}

const TAG_COLORS = [
  "hsl(174, 62%, 47%)",
  "hsl(340, 82%, 52%)",
  "hsl(45, 93%, 47%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(142, 71%, 45%)",
  "hsl(25, 95%, 53%)",
];

const TagManager = ({ selectedTags, onTagsChange, expenseId }: TagManagerProps) => {
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("expense_tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name_bn");

    if (data) setTags(data);
    if (error) console.error("Error fetching tags:", error);
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("expense_tags")
      .insert({
        user_id: user.id,
        name_bn: newTagName.trim(),
        color: selectedColor,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "ত্রুটি",
        description: "ট্যাগ তৈরি করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } else if (data) {
      setTags([...tags, data]);
      setNewTagName("");
      toast({ title: "সফল", description: "ট্যাগ তৈরি হয়েছে" });
    }
    setLoading(false);
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const deleteTag = async (tagId: string) => {
    const { error } = await supabase
      .from("expense_tags")
      .delete()
      .eq("id", tagId);

    if (error) {
      toast({
        title: "ত্রুটি",
        description: "ট্যাগ মুছতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } else {
      setTags(tags.filter(t => t.id !== tagId));
      onTagsChange(selectedTags.filter(id => id !== tagId));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedTags.includes(tag.id) ? "default" : "outline"}
            className="cursor-pointer transition-all text-xs md:text-sm"
            style={{
              backgroundColor: selectedTags.includes(tag.id) ? tag.color : "transparent",
              borderColor: tag.color,
              color: selectedTags.includes(tag.id) ? "white" : tag.color,
            }}
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name_bn}
          </Badge>
        ))}
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              নতুন ট্যাগ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                নতুন ট্যাগ তৈরি
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="ট্যাগের নাম"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">রং নির্বাচন করুন</p>
                <div className="flex gap-2 flex-wrap">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={createTag} disabled={loading || !newTagName.trim()} className="w-full">
                তৈরি করুন
              </Button>
              
              {tags.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">বিদ্যমান ট্যাগ</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        style={{ backgroundColor: tag.color }}
                        className="pr-1 gap-1"
                      >
                        {tag.name_bn}
                        <button
                          onClick={() => deleteTag(tag.id)}
                          className="hover:bg-white/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TagManager;
