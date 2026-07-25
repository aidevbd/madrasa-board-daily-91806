import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-7xl md:text-8xl font-bold text-primary">৪০৪</h1>
        <div className="space-y-2">
          <p className="text-xl md:text-2xl font-semibold text-foreground">
            পেজটি খুঁজে পাওয়া যায়নি
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            আপনি যে পেজটি খুঁজছেন তা এখানে নেই বা সরিয়ে ফেলা হয়েছে।
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/" className="inline-flex items-center gap-2">
            <Home className="h-4 w-4" />
            হোমে ফিরুন
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
