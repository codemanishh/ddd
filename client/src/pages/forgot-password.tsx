import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { User, ArrowLeft, Utensils, CheckCircle } from "lucide-react";
import { resetPasswordRequestSchema, type ResetPasswordRequestInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPassword() {
  const { adminUid } = useParams<{ adminUid: string }>();
  const [, setLocation] = useLocation();
  const [emailSent, setEmailSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const { toast } = useToast();

  const form = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      adminUid: adminUid || "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ResetPasswordRequestInput) => {
      return await apiRequest<{ message: string; email: string }>("POST", "/api/auth/forgot-password", data);
    },
    onSuccess: (data) => {
      setMaskedEmail(data.email || "");
      setEmailSent(true);
      toast({
        title: "Email sent!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message || "Could not send reset email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordRequestInput) => {
    resetMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between gap-4 p-4 border-b">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">TableServe</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent password reset instructions to <strong>{maskedEmail}</strong>.
                Please check your inbox and follow the link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation(`/admin/${adminUid}`)}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <Utensils className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">TableServe</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your Admin ID and we'll send a password reset link to your registered email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="adminUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Enter your Admin ID"
                          data-testid="input-admin-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending}
                  data-testid="button-send-reset"
                >
                  {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>
            <div className="mt-4">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setLocation(`/admin/${adminUid}`)}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
