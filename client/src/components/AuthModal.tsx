import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, LoginData, RegisterData } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";

// Modified to accept either username or email
const loginSchema = z.object({
  username: z.string().min(3, "Username or email must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  action?: "login" | "register" | "forgot-password";
};

// Google Sign-In Button Component
const GoogleSignInButton = () => {
  const [location] = useLocation();
  const savedEventId = localStorage.getItem('quranCircleReturnToEvent');
  
  // Create the returnTo URL based on current location or saved event
  const getReturnToUrl = () => {
    if (savedEventId) {
      return `/events/${savedEventId}`;
    }
    return location;
  };
  
  const handleGoogleSignIn = () => {
    // Redirect to the Google auth endpoint with the current location as returnTo
    const returnTo = encodeURIComponent(getReturnToUrl());
    window.location.href = `/auth/google-redirect?returnTo=${returnTo}`;
  };
  
  return (
    <Button 
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 font-medium"
      onClick={handleGoogleSignIn}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
          <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
          <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
          <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
          <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
        </g>
      </svg>
      Sign in with Google
    </Button>
  );
}

export default function AuthModal({ isOpen, onClose, action = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">(action);
  const { loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [forgotPasswordSubmitting, setForgotPasswordSubmitting] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    // Get event ID from localStorage if it exists
    const savedEventId = localStorage.getItem('quranCircleReturnToEvent');
    
    // Include the returnTo parameter if we have a saved event ID
    const loginData: LoginFormValues & { returnTo?: string } = { ...data };
    if (savedEventId) {
      loginData.returnTo = `/events/${savedEventId}`;
    }
    
    loginMutation.mutate(loginData, {
      onSuccess: () => {
        toast({
          title: "Login successful",
          description: "You are now logged in.",
        });
        onClose();
        
        // Clear the saved event ID after successful login
        if (savedEventId) {
          localStorage.removeItem('quranCircleReturnToEvent');
        }
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Get event ID from localStorage if it exists
    const savedEventId = localStorage.getItem('quranCircleReturnToEvent');
    
    // Include the returnTo parameter if we have a saved event ID
    const registerData: RegisterFormValues & { returnTo?: string } = { ...data };
    if (savedEventId) {
      registerData.returnTo = `/events/${savedEventId}`;
    }
    
    registerMutation.mutate(registerData, {
      onSuccess: () => {
        toast({
          title: "Registration successful",
          description: "Your account has been created. You are now logged in.",
        });
        onClose();
        
        // Clear the saved event ID after successful registration
        if (savedEventId) {
          localStorage.removeItem('quranCircleReturnToEvent');
        }
      },
      onError: (error) => {
        toast({
          title: "Registration failed", 
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setForgotPasswordSubmitting(true);
      
      await apiRequest("POST", "/api/forgot-password", data);
      
      setForgotPasswordSuccess(true);
      toast({
        title: "Password reset email sent",
        description: "If an account with that email exists, we've sent a password reset link.",
      });
    } catch (error) {
      toast({
        title: "Failed to send reset email",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive",
      });
    } finally {
      setForgotPasswordSubmitting(false);
    }
  };

  const getDialogTitle = () => {
    switch (activeTab) {
      case "login": return "Login";
      case "register": return "Create Account";
      case "forgot-password": return "Reset Password";
      default: return "Authentication";
    }
  };

  const getDialogDescription = () => {
    switch (activeTab) {
      case "login": 
        return "Log in to your account to participate in Quran reading events.";
      case "register": 
        return "Create an account to join our Quran reading community.";
      case "forgot-password": 
        return "Enter your email address to receive a password reset link.";
      default: 
        return "";
    }
  };

  const renderForgotPasswordTab = () => {
    if (forgotPasswordSuccess) {
      return (
        <div className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">Check your email</h3>
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to your email address.
            </p>
          </div>
          <Button 
            type="button" 
            className="w-full bg-[hsl(var(--quran-green))] hover:opacity-90 text-white" 
            onClick={() => setActiveTab("login")}
          >
            Back to Login
          </Button>
        </div>
      );
    }

    return (
      <Form {...forgotPasswordForm}>
        <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
          <FormField
            control={forgotPasswordForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Your email address" 
                    {...field} 
                    autoComplete="email"
                    type="email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="w-full bg-[hsl(var(--quran-green))] hover:opacity-90 text-white" 
            disabled={forgotPasswordSubmitting}
          >
            {forgotPasswordSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
          <div className="text-sm text-center mt-4">
            <span 
              className="text-sm text-primary hover:underline cursor-pointer"
              onClick={() => setActiveTab("login")}
            >
              Back to Login
            </span>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {activeTab === "forgot-password" ? (
          renderForgotPasswordTab()
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username or Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username or email" 
                            {...field} 
                            autoComplete="username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="" 
                            {...field} 
                            autoComplete="current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-[hsl(var(--quran-green))] hover:opacity-90 text-white" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Logging in..." : "Login"}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <GoogleSignInButton />
                  
                  <div className="text-sm text-center mt-4">
                    <span 
                      className="text-sm text-primary hover:underline cursor-pointer"
                      onClick={() => setActiveTab("forgot-password")}
                    >
                      Forgot your password?
                    </span>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Choose a username" 
                            {...field} 
                            autoComplete="username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your email address" 
                            {...field} 
                            autoComplete="email"
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="" 
                            {...field} 
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-[hsl(var(--quran-green))] hover:opacity-90 text-white" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Register"}
                  </Button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <GoogleSignInButton />
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}