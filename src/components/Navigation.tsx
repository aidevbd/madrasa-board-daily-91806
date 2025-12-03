import { Home, PlusCircle, FileText, Settings, List, ShoppingBasket } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "হোম" },
    { path: "/bulk-expense", icon: ShoppingBasket, label: "বাজার" },
    { path: "/add-expense", icon: PlusCircle, label: "খরচ" },
    { path: "/transactions", icon: List, label: "তালিকা" },
    { path: "/reports", icon: FileText, label: "রিপোর্ট" },
    { path: "/settings", icon: Settings, label: "সেটিংস" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 md:h-18 lg:h-20 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-1 md:px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 md:gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
              <span className="text-[9px] md:text-xs lg:text-sm font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
