import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Shield, ArrowLeft, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const forgotPasswordSchema = z.object({
  superAdminUid: z.string().min(1, "Super Admin ID is required"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function SuperAdminForgotPassword() {
  const { superAdminUid } = useParams<{ superAdminUid: string }>();
  const [, setLocation] = useLocation();
  const [emailSent, setEmailSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const { toast } = useToast();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      superAdminUid: superAdminUid || "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      return await apiRequest<{ message: string; email: string }>("POST", "/api/superadmin/forgot-password", data);
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

  const onSubmit = (data: ForgotPasswordInput) => {
    resetMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-gray-700 bg-gray-800/90 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Check Your Email</CardTitle>
            <CardDescription className="text-gray-400">
              We've sent password reset instructions to <strong className="text-white">{maskedEmail}</strong>.
              Please check your inbox and follow the link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={() => setLocation(`/superadmin/${superAdminUid}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-gray-700 bg-gray-800/90 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Forgot Password</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your Super Admin ID and we'll send a password reset link to your registered email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="superAdminUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Super Admin ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your Super Admin ID"
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>
          <div className="mt-4">
            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-gray-700"
              onClick={() => setLocation(`/superadmin/${superAdminUid}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
