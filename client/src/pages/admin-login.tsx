import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Lock, Eye, EyeOff, UtensilsCrossed, Sparkles } from "lucide-react";
import { loginSchema, type LoginInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLogin() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      adminUid: adminUid || "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data: any) => {
      login(data.admin, data.token);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.admin.restaurantName}`,
      });
      setLocation(`/admin/${adminUid}/dashboard`);
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-950 dark:via-purple-950/30 dark:to-gray-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <header className="relative z-10 glass border-b border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">TableServe</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-0 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-500/30">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl md:text-3xl font-bold">Admin Login</CardTitle>
              <CardDescription className="mt-2 text-gray-600 dark:text-gray-400">
                Sign in to manage your restaurant
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="adminUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Admin ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your admin ID"
                          data-testid="input-admin-uid"
                          className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 bg-white/50 dark:bg-gray-800/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300 font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            data-testid="input-password"
                            className="h-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 bg-white/50 dark:bg-gray-800/50 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-500" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl btn-gradient text-lg font-semibold"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => setLocation(`/admin/${adminUid || "reset"}/forgot-password`)}
                data-testid="link-forgot-password"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium"
              >
                Forgot your password?
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="relative z-10 glass border-t border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="gradient-text font-semibold">TableServe</span> - Restaurant Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
