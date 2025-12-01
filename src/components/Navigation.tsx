import { Home, PlusCircle, FileText, Settings, List, ShoppingBasket, DollarSign, Image } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "হোম" },
    { path: "/bulk-expense", icon: ShoppingBasket, label: "বাজার" },
    { path: "/add-expense", icon: PlusCircle, label: "খরচ" },
    { path: "/receipts", icon: Image, label: "রশিদ" },
    { path: "/transactions", icon: List, label: "তালিকা" },
    { path: "/budget", icon: DollarSign, label: "বাজেট" },
    { path: "/reports", icon: FileText, label: "রিপোর্ট" },
    { path: "/settings", icon: Settings, label: "সেটিংস" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex overflow-x-auto items-center h-16 max-w-lg mx-auto px-1 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[70px] h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
