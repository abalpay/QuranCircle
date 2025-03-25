import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Form schema for reset password
const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [, params] = useRoute('/reset-password');
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Extract token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  
  // Redirect if no token is present
  useEffect(() => {
    if (!token) {
      setLocation('/forgot-password');
    }
  }, [token, setLocation]);

  // Set up form with validation
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Verify token validity
  const tokenQuery = useQuery({
    queryKey: ['/api/reset-password', token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const response = await apiRequest("GET", `/api/reset-password/${token}`);
      return response.json();
    },
    enabled: !!token,
  });

  // Set up mutation for reset password API call
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { token: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/reset-password", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ResetPasswordFormValues) => {
    if (!token) return;
    
    resetPasswordMutation.mutate({
      token,
      newPassword: data.newPassword,
    });
  };

  // Loading state
  if (tokenQuery.isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[hsl(var(--quran-gray))]">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold text-gray-800">Verifying Reset Link</h1>
            <p className="text-gray-600 mt-2">
              Please wait while we verify your password reset link...
            </p>
          </div>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[hsl(var(--quran-green))]"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - invalid token
  if (tokenQuery.isError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[hsl(var(--quran-gray))]">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm">
          <div className="text-center mb-4">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">Invalid Reset Link</h1>
            <p className="text-gray-600 mt-2">
              This password reset link is invalid or has expired.
            </p>
          </div>
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-4 text-center">
              Please request a new password reset link.
            </p>
            <Link href="/">
              <Button 
                className="w-full py-6 bg-[hsl(var(--quran-green))] hover:opacity-90 text-white"
              >
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[hsl(var(--quran-gray))]">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm">
          <div className="text-center mb-4">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">Password Reset Successful</h1>
            <p className="text-gray-600 mt-2">
              Your password has been reset successfully.
            </p>
          </div>
          <div className="mt-8">
            <p className="text-sm text-gray-500 mb-4 text-center">
              You can now sign in with your new password.
            </p>
            <Link href="/">
              <Button className="w-full py-6 bg-[hsl(var(--quran-green))] hover:opacity-90 text-white">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="flex justify-center items-center min-h-screen bg-[hsl(var(--quran-gray))]">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-sm">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Reset Password</h1>
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
        
        <p className="text-gray-600 mb-6">Create a new password for your account</p>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        {...field} 
                        type="password"
                        className="pl-10 py-6 bg-[hsl(var(--quran-gray))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--quran-green))]"
                        autoComplete="new-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-medium">Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        {...field} 
                        type="password"
                        className="pl-10 py-6 bg-[hsl(var(--quran-gray))] border-0 focus-visible:ring-1 focus-visible:ring-[hsl(var(--quran-green))]"
                        autoComplete="new-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full py-6 bg-[hsl(var(--quran-green))] hover:opacity-90 text-white font-medium text-base"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}