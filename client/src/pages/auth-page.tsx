import { useState, useEffect } from "react";
import { useAuth, RegisterData, LoginData } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [returnTo, setReturnTo] = useState<string>("/");
  
  // Extract returnTo from URL params on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const returnPath = searchParams.get("returnTo");
    if (returnPath) {
      setReturnTo(returnPath);
    }
  }, []);

  // Redirect if already logged in
  if (user) {
    navigate(returnTo);
    return null;
  }
  
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
      password: "",
      confirmPassword: "",
    },
  });
  
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ ...data, returnTo });
  };
  
  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { username, password } = data;
    registerMutation.mutate({ username, password, returnTo });
  };
  
  return (
    <div className="flex flex-col md:flex-row min-h-[80vh] items-center justify-center py-6">
      <div className="w-full max-w-md px-4 mb-8 md:mb-0">
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-heading font-bold text-primary-dark">
                  Sign In
                </CardTitle>
                <CardDescription>
                  Sign in to create and manage your events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
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
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-dark"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-neutral-600">
                    Don't have an account?{" "}
                    <button 
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("register")}
                    >
                      Create an account
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-heading font-bold text-primary-dark">
                  Create Account
                </CardTitle>
                <CardDescription>
                  Register to create Quran reading events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Choose a username" {...field} />
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
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary-dark"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-neutral-600">
                    Already have an account?{" "}
                    <button 
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("login")}
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="w-full max-w-md px-4 hidden md:block">
        <div className="bg-primary text-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center justify-center mb-6">
            <BookOpen className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-4 text-center">Welcome to Quran Circle</h2>
          <p className="mb-6">
            Quran Circle is a platform that allows you to create and join collaborative Quran reading events. 
            Create khatms, invite participants, and track progress together.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">✓</div>
              <span>Create reading events for your community</span>
            </li>
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">✓</div>
              <span>Share with others via a simple link</span>
            </li>
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">✓</div>
              <span>No login required for participants</span>
            </li>
            <li className="flex items-center">
              <div className="h-6 w-6 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3">✓</div>
              <span>Automatic creation of new khatms</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
