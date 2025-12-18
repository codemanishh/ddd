import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { CustomerProvider } from "@/lib/customer-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AdminLogin from "@/pages/admin-login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AdminLayout from "@/pages/admin-layout";
import CustomerMenu from "@/pages/customer-menu";
import CustomerOrders from "@/pages/customer-orders";
import SuperAdminLogin from "@/pages/superadmin-login";
import SuperAdminDashboard from "@/pages/superadmin-dashboard";
import SuperAdminForgotPassword from "@/pages/superadmin-forgot-password";
import SuperAdminResetPassword from "@/pages/superadmin-reset-password";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/:adminUid" component={AdminLogin} />
      <Route path="/admin/:adminUid/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/admin/:adminUid/dashboard" component={AdminLayout} />
      <Route path="/admin/:adminUid/menu" component={AdminLayout} />
      <Route path="/admin/:adminUid/orders" component={AdminLayout} />
      <Route path="/admin/:adminUid/billing" component={AdminLayout} />
      <Route path="/admin/:adminUid/analytics" component={AdminLayout} />
      <Route path="/admin/:adminUid/settings" component={AdminLayout} />
      <Route path="/user/:adminUid/menu" component={CustomerMenu} />
      <Route path="/user/:adminUid/orders" component={CustomerOrders} />
      <Route path="/superadmin/:superAdminUid" component={SuperAdminLogin} />
      <Route path="/superadmin/:superAdminUid/forgot-password" component={SuperAdminForgotPassword} />
      <Route path="/superadmin/:superAdminUid/dashboard" component={SuperAdminDashboard} />
      <Route path="/superadmin-reset-password/:token" component={SuperAdminResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="tableserve-theme">
        <AuthProvider>
          <CustomerProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </CustomerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
