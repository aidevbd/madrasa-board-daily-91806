import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search, Image as ImageIcon, Calendar, DollarSign } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Receipts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredReceipts(receipts);
    } else {
      const filtered = receipts.filter(receipt => 
        receipt.item_name_bn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.expense_categories?.name_bn?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredReceipts(filtered);
    }
  }, [searchQuery, receipts]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("expenses")
        .select("*, expense_categories(name_bn), units(name_bn)")
        .eq("user_id", user.id)
        .not("receipt_image_url", "is", null)
        .order("expense_date", { ascending: false });

      if (error) throw error;

      setReceipts(data || []);
      setFilteredReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast({
        title: "ত্রুটি",
        description: "রশিদ লোড করতে সমস্যা হয়েছে",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSignedUrl = async (imagePath: string) => {
    try {
      // Extract the file path from the full URL
      const urlParts = imagePath.split('/receipts/');
      if (urlParts.length < 2) return imagePath;
      
      const filePath = urlParts[1];
      
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error("Error creating signed URL:", error);
        return imagePath;
      }

      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return imagePath;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">রশিদ গ্যালারি</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="রশিদ খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Stats Card */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <span className="font-semibold">মোট রশিদ:</span>
            </div>
            <span className="text-2xl font-bold text-primary">{filteredReceipts.length}</span>
          </div>
        </Card>

        {/* Gallery Grid */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">লোড হচ্ছে...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <Card className="p-8 text-center">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? "কোনো রশিদ পাওয়া যায়নি" : "এখনো কোনো রশিদ যোগ করা হয়নি"}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredReceipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={async () => {
                  const signedUrl = await getSignedUrl(receipt.receipt_image_url);
                  setSelectedReceipt({ ...receipt, signedUrl });
                }}
              >
                <div className="aspect-square bg-muted relative">
                  <img
                    src={receipt.receipt_image_url}
                    alt={receipt.item_name_bn}
                    className="w-full h-full object-cover"
                    onError={async (e) => {
                      // Try to get signed URL on error
                      const signedUrl = await getSignedUrl(receipt.receipt_image_url);
                      (e.target as HTMLImageElement).src = signedUrl;
                    }}
                  />
                </div>
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-sm line-clamp-1">{receipt.item_name_bn}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{receipt.expense_date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                    <DollarSign className="h-3 w-3" />
                    <span>৳ {Number(receipt.total_price).toFixed(2)}</span>
                  </div>
                  {receipt.expense_categories && (
                    <p className="text-xs text-muted-foreground">
                      {receipt.expense_categories.name_bn}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Receipt Detail Modal */}
        {selectedReceipt && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReceipt(null)}
          >
            <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">রশিদ বিস্তারিত</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReceipt(null)}
                  >
                    বন্ধ করুন
                  </Button>
                </div>
                
                <img
                  src={selectedReceipt.signedUrl || selectedReceipt.receipt_image_url}
                  alt={selectedReceipt.item_name_bn}
                  className="w-full rounded-lg"
                />
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">আইটেম</p>
                    <p className="font-semibold">{selectedReceipt.item_name_bn}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">তারিখ</p>
                      <p className="font-semibold">{selectedReceipt.expense_date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">মূল্য</p>
                      <p className="font-semibold text-primary">৳ {Number(selectedReceipt.total_price).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {selectedReceipt.quantity && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">পরিমাণ</p>
                        <p className="font-semibold">{selectedReceipt.quantity} {selectedReceipt.units?.name_bn}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedReceipt.expense_categories && (
                    <div>
                      <p className="text-sm text-muted-foreground">ক্যাটাগরি</p>
                      <p className="font-semibold">{selectedReceipt.expense_categories.name_bn}</p>
                    </div>
                  )}
                  
                  {selectedReceipt.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">নোট</p>
                      <p className="font-semibold">{selectedReceipt.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
};

export default Receipts;