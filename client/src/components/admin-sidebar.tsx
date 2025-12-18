import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  Receipt, 
  BarChart3, 
  Settings,
  LogOut,
  Copy,
  Check
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  adminUid: string;
}

export function AdminSidebar({ adminUid }: AdminSidebarProps) {
  const [location, setLocation] = useLocation();
  const { admin, logout } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const menuUrl = `${window.location.origin}/user/${adminUid}/menu`;

  const menuItems = [
    {
      title: "Dashboard",
      url: `/admin/${adminUid}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Menu Management",
      url: `/admin/${adminUid}/menu`,
      icon: UtensilsCrossed,
    },
    {
      title: "Orders",
      url: `/admin/${adminUid}/orders`,
      icon: ClipboardList,
    },
    {
      title: "Billing",
      url: `/admin/${adminUid}/billing`,
      icon: Receipt,
    },
    {
      title: "Analytics",
      url: `/admin/${adminUid}/analytics`,
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: `/admin/${adminUid}/settings`,
      icon: Settings,
    },
  ];

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Menu URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    setLocation(`/admin/${adminUid}`);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate" data-testid="text-restaurant-name">
              {admin?.restaurantName || "Restaurant"}
            </h2>
            <p className="text-xs text-muted-foreground truncate">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu URL</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate" data-testid="text-menu-url">
                    {menuUrl}
                  </p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopyUrl}
                  data-testid="button-copy-menu-url"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <a 
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation(item.url);
                      }}
                      data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
