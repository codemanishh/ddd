import { useEffect } from "react";
import { useParams, useLocation, Switch, Route } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import AdminDashboard from "./admin-dashboard";
import AdminMenu from "./admin-menu";
import AdminOrders from "./admin-orders";
import AdminBilling from "./admin-billing";
import AdminAnalytics from "./admin-analytics";
import AdminSettings from "./admin-settings";

export default function AdminLayout() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(`/admin/${adminUid}`);
    }
  }, [isLoading, isAuthenticated, adminUid, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Skeleton className="w-64 h-full" />
        <div className="flex-1 p-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AdminSidebar adminUid={adminUid || ""} />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/admin/:adminUid/dashboard" component={AdminDashboard} />
              <Route path="/admin/:adminUid/menu" component={AdminMenu} />
              <Route path="/admin/:adminUid/orders" component={AdminOrders} />
              <Route path="/admin/:adminUid/billing" component={AdminBilling} />
              <Route path="/admin/:adminUid/analytics" component={AdminAnalytics} />
              <Route path="/admin/:adminUid/settings" component={AdminSettings} />
            </Switch>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
