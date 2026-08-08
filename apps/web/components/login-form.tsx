"use client";

import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@repo/ui/components/ui/field";
import { Input } from "@repo/ui/components/ui/input";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import Image from "next/image";
import logo from "../app/assets/images/logos/kpt-logo.png";
import BrandPanel from "./BrandPanel";
import { useAuth } from "../contexts/AuthContext";
import { validateEmailBasic } from "../lib/validation";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.9l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.31A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.39-2.31v-3.1H1.28A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.28 5.41l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.59l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError, user, isAuthenticated, isLoading } =
    useAuth();
  const router = useRouter();

  const emailError = useMemo(() => {
    if (!email) return undefined;
    const validation = validateEmailBasic(email);
    return validation.isValid ? undefined : validation.error;
  }, [email]);

  // Check if user is already authenticated and redirect accordingly
  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const role = user.role?.toUpperCase();

      if (role === "SALES") {
        router.push("/sales-user");
      } else {
        router.push("/");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      const loggedInUser = await login({ email, password });
      const role = loggedInUser?.role?.toUpperCase();

      if (role === "SALES") {
        router.push("/sales-user");
      } else {
        router.push("/");
      }
    } catch (err) {
      // Error is handled by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn("grid h-screen w-full overflow-hidden md:grid-cols-2", className)}
      {...props}
    >
      {/* Left: form panel — fixed to the viewport, no scrolling */}
      <div className="flex h-full flex-col items-center justify-center bg-background px-6 py-6 sm:px-12">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          <Image
            src={logo}
            alt="KPT — Kulkarni Power Tools"
            width={160}
            height={54}
            priority
            className="mb-6 h-10 w-auto object-contain object-left"
          />

          <div className="mb-5">
            <h1 className="text-[1.75rem] font-bold leading-[1.15] text-foreground">
              Partner Portal
              <br />
              <span className="text-primary">Sign In</span>
            </h1>
            <span className="mt-2.5 block h-[3px] w-14 rounded-full bg-primary" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Access the KPT Partner Portal to manage your channel partners,
              track stock visibility, monitor incentives, and analyse sales
              performance — all in one place.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-4">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="email">Username or Email</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your username or email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                    className="pl-9"
                  />
                </div>
                {emailError && (
                  <p id="email-error" className="mt-1 text-xs text-destructive">
                    {emailError}
                  </p>
                )}
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm text-brand-teal underline-offset-2 hover:text-brand-indigo hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect x="4" y="10" width="16" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    suppressHydrationWarning
                  >
                    {!showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              <Field orientation="horizontal">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
                <FieldLabel
                  htmlFor="remember-me"
                  className="cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  Remember me
                </FieldLabel>
              </Field>

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full border-0 bg-primary text-white shadow-sm hover:opacity-90"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Signing in..." : "Sign In"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </Button>
              </Field>

              <FieldSeparator>or continue with</FieldSeparator>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-accent"
                >
                  <GoogleIcon />
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-accent"
                >
                  <MicrosoftIcon />
                  Microsoft
                </Button>
              </div>

              <FieldDescription className="text-center text-muted-foreground">
                For access, contact your KPT regional manager.
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="mt-3 text-center text-xs text-muted-foreground">
            <span>www.kpt.co.in</span>
          </div>
        </div>
      </div>

      {/* Right: brand panel */}
      <BrandPanel />
    </div>
  );
}
