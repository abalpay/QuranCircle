"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createPasswordSchema } from "@/lib/auth/password-policy";
import { trackProductEvent } from "@/lib/analytics";
import { useTranslations } from "next-intl";

const MERGE_PREPARATION_BLOCK_MESSAGE =
  "Could not secure claim transfer, retry required.";

function isMergePreparationError(error: Error | null | undefined) {
  return Boolean(
    error &&
      (error.name === "MergePreparationError" ||
        error.message === MERGE_PREPARATION_BLOCK_MESSAGE)
  );
}

type LoginFormValues = { email: string; password: string };
type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
};
type ForgotPasswordFormValues = { email: string };

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  action?: "login" | "register" | "forgot-password";
  onSuccess?: () => void;
};

const GoogleSignInButton = () => {
  const t = useTranslations("AuthModal");
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    trackProductEvent("Auth Started", { action: "google", source: "auth_modal" });
    const { error } = await signInWithGoogle();
    if (error) {
      if (isMergePreparationError(error)) {
        toast.error(t("googlePaused"), {
          description: t("claimTransferError"),
        });
        return;
      }
      toast.error(t("googleFailed"), {
        description: t("genericAuthError"),
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-full border-quran-border bg-white/80 font-medium"
      onClick={handleGoogleSignIn}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
          <path
            fill="#4285F4"
            d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
          />
          <path
            fill="#34A853"
            d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
          />
          <path
            fill="#FBBC05"
            d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
          />
          <path
            fill="#EA4335"
            d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
          />
        </g>
      </svg>
      {t("signInWithGoogle")}
    </Button>
  );
};

export default function AuthModal({
  isOpen,
  onClose,
  action = "login",
  onSuccess,
}: AuthModalProps) {
  const t = useTranslations("AuthModal");
  const [selectedTab, setSelectedTab] = useState<
    "login" | "register" | "forgot-password" | null
  >(null);
  const activeTab = selectedTab ?? action;
  const setActiveTab = (tab: "login" | "register" | "forgot-password") => {
    setSelectedTab(tab);
  };
  const { signInWithPassword, signUp, resetPassword } = useAuth();
  const [forgotPasswordSubmitting, setForgotPasswordSubmitting] =
    useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("invalidEmail")),
    password: z.string().min(8, t("passwordMinLength")),
  });
  const registerSchema = z.object({
    username: z.string().min(2, t("usernameMinLength")),
    email: z.string().email(t("invalidEmail")),
    password: createPasswordSchema(t("passwordRequirements")),
  });
  const forgotPasswordSchema = z.object({
    email: z.string().email(t("invalidEmail")),
  });

  const closeAndReset = () => {
    setSelectedTab(null);
    setForgotPasswordSuccess(false);
    onClose();
  };

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    try {
      const { error } = await signInWithPassword(data.email, data.password);
      if (error) {
        if (isMergePreparationError(error)) {
          toast.error(t("loginPaused"), {
            description: t("claimTransferError"),
          });
          return;
        }
        toast.error(t("loginFailed"), {
          description: t("genericAuthError"),
        });
        return;
      }
      trackProductEvent("Auth Completed", { method: "password_login" });
      toast.success(t("loginSuccessful"));
      closeAndReset();
      onSuccess?.();
    } catch (error) {
      console.error("[auth-modal] login failed", error);
      toast.error(t("loginFailed"), {
        description: t("genericAuthError"),
      });
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      const { error } = await signUp(data.email, data.password, data.username);
      if (error) {
        if (isMergePreparationError(error)) {
          toast.error(t("registrationPaused"), {
            description: t("claimTransferError"),
          });
          return;
        }
        toast.error(t("registrationFailed"), {
          description: t("genericAuthError"),
        });
        return;
      }
      trackProductEvent("Auth Completed", { method: "password_register" });
      toast.success(t("accountCreated"));
      closeAndReset();
      onSuccess?.();
    } catch (error) {
      console.error("[auth-modal] registration failed", error);
      toast.error(t("registrationFailed"), {
        description: t("genericAuthError"),
      });
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    setForgotPasswordSubmitting(true);
    const { error } = await resetPassword(data.email);
    setForgotPasswordSubmitting(false);
    if (error) {
      toast.error(t("resetEmailFailed"), {
        description: t("genericAuthError"),
      });
      return;
    }
    setForgotPasswordSuccess(true);
    toast.success(t("resetEmailSent"));
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAndReset();
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl border-quran-border bg-quran-card p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-3xl text-quran-deep">
            {activeTab === "forgot-password"
              ? t("resetPassword")
              : activeTab === "register"
                ? t("createAccount")
                : t("login")}
          </DialogTitle>
          <DialogDescription>
            {activeTab === "forgot-password"
              ? t("resetDescription")
              : activeTab === "register"
                ? t("registerDescription")
                : t("loginDescription")}
          </DialogDescription>
        </DialogHeader>

        {activeTab === "forgot-password" ? (
          forgotPasswordSuccess ? (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-quran-deep">
                  {t("checkEmail")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("checkEmailDescription")}
                </p>
              </div>
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={() => setActiveTab("login")}
              >
                {t("backToLogin")}
              </Button>
            </div>
          ) : (
            <Form {...forgotPasswordForm}>
              <form
                onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("emailPlaceholder")}
                          {...field}
                          type="email"
                          required
                          aria-required="true"
                          autoComplete="email"
                          className="rounded-xl border-quran-border bg-white/85"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full rounded-full"
                  disabled={forgotPasswordSubmitting}
                >
                  {forgotPasswordSubmitting
                    ? t("sending")
                    : t("sendResetLink")}
                </Button>
                <button
                  type="button"
                  className="mt-2 min-h-11 w-full rounded-full text-center text-sm text-primary hover:bg-quran-green/[0.05] hover:underline"
                  onClick={() => setActiveTab("login")}
                >
                  {t("backToLogin")}
                </button>
              </form>
            </Form>
          )
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "login" | "register")}
          >
            <TabsList className="grid w-full grid-cols-2 rounded-full border border-quran-border bg-white/70 p-1">
              <TabsTrigger
                value="login"
                className="rounded-full data-[state=active]:bg-quran-green data-[state=active]:text-primary-foreground"
              >
                {t("login")}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-full data-[state=active]:bg-quran-green data-[state=active]:text-primary-foreground"
              >
                {t("register")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4 py-4">
                <GoogleSignInButton />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("continueWithEmail")}
                    </span>
                  </div>
                </div>
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("email")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="you@example.com"
                              {...field}
                              type="email"
                              required
                              aria-required="true"
                              autoComplete="email"
                              className="rounded-xl border-quran-border bg-white/85"
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
                          <FormLabel>{t("password")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              required
                              aria-required="true"
                              autoComplete="current-password"
                              className="rounded-xl border-quran-border bg-white/85"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-full px-1 text-left text-sm text-primary hover:underline"
                      onClick={() => setActiveTab("forgot-password")}
                    >
                      {t("forgotPassword")}
                    </button>
                    <Button
                      type="submit"
                      className="w-full rounded-full"
                      disabled={loginForm.formState.isSubmitting}
                    >
                      {loginForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("loggingIn")}
                        </>
                      ) : (
                        t("login")
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4 py-4">
                <GoogleSignInButton />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("continueWithEmail")}
                    </span>
                  </div>
                </div>
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("username")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("namePlaceholder")}
                              {...field}
                              autoComplete="username"
                              className="rounded-xl border-quran-border bg-white/85"
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
                          <FormLabel>{t("email")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="you@example.com"
                              {...field}
                              type="email"
                              required
                              aria-required="true"
                              autoComplete="email"
                              className="rounded-xl border-quran-border bg-white/85"
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
                          <FormLabel>{t("password")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              {...field}
                              required
                              aria-required="true"
                              autoComplete="new-password"
                              className="rounded-xl border-quran-border bg-white/85"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("passwordRequirementsDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full rounded-full"
                      disabled={registerForm.formState.isSubmitting}
                    >
                      {registerForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("creatingAccount")}
                        </>
                      ) : (
                        t("createAccount")
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
