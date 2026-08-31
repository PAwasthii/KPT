"use client";

import { Eye, EyeOff, Loader2, ArrowRight, Mail, KeyRound } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/ui/field";
import { Input } from "@repo/ui/components/ui/input";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import Image from "next/image";
import logo from "../app/assets/images/logos/kpt-logo.png";
import BrandPanel from "./BrandPanel";
import { useAuth } from "../contexts/AuthContext";
import { validateEmailBasic } from "../lib/validation";

// ─── Tab types ──────────────────────────────────────────────────────────────

type AuthTab = "password" | "otp";
type OtpStep = "email" | "code";

// ─── Password tab ───────────────────────────────────────────────────────────

function PasswordTab() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuth();
  const router = useRouter();

  const emailError = useMemo(() => {
    if (!email) return undefined;
    const v = validateEmailBasic(email);
    return v.isValid ? undefined : v.error;
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();
    try {
      const user = await login({ email, password });
      router.push(user?.role?.toUpperCase() === "SALES" ? "/sales-user" : "/");
    } catch {
      // error set by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </span>
            <Input
              id="email"
              type="text"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!emailError}
              className="pl-9"
            />
          </div>
          {emailError && (
            <p className="mt-1 text-xs text-destructive">{emailError}</p>
          )}
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="ml-auto text-sm text-primary underline-offset-2 hover:text-brand-orange-dark hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
              suppressHydrationWarning
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field orientation="horizontal">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={setRememberMe}
          />
          <FieldLabel htmlFor="remember-me" className="cursor-pointer text-sm font-normal text-muted-foreground">
            Remember me
          </FieldLabel>
        </Field>

        <Field>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full border-0 bg-primary text-white shadow-sm hover:opacity-90"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Signing in..." : "Sign In"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

// ─── Email OTP tab ──────────────────────────────────────────────────────────

function OtpTab() {
  const [step, setStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { sendLoginOtp, loginWithOtp, error, clearError } = useAuth();
  const router = useRouter();

  const emailError = useMemo(() => {
    if (!email) return undefined;
    const v = validateEmailBasic(email);
    return v.isValid ? undefined : v.error;
  }, [email]);

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || emailError) return;
    setIsSending(true);
    clearError();
    try {
      await sendLoginOtp(email.trim().toLowerCase());
      setStep("code");
      startCooldown();
    } catch {
      // error set by context
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsSending(true);
    clearError();
    try {
      await sendLoginOtp(email.trim().toLowerCase());
      startCooldown();
    } catch {
      // error set by context
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    setIsVerifying(true);
    clearError();
    try {
      const user = await loginWithOtp(email.trim().toLowerCase(), otp);
      router.push(user?.role?.toUpperCase() === "SALES" ? "/sales-user" : "/");
    } catch {
      // error set by context
    } finally {
      setIsVerifying(false);
    }
  };

  if (step === "email") {
    return (
      <form onSubmit={handleSendOtp}>
        <FieldGroup className="gap-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="otp-email">Email address</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                id="otp-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                required
                aria-invalid={!!emailError}
                className="pl-9"
              />
            </div>
            {emailError && (
              <p className="mt-1 text-xs text-destructive">{emailError}</p>
            )}
          </Field>
          <p className="text-xs text-muted-foreground">
            We'll send a 6-digit code to this address. No password needed.
          </p>
          <Field>
            <Button
              type="submit"
              disabled={isSending || !!emailError || !email}
              className="w-full border-0 bg-primary text-white shadow-sm hover:opacity-90"
            >
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSending ? "Sending code..." : "Send Code"}
              {!isSending && <ArrowRight className="h-4 w-4" />}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify}>
      <FieldGroup className="gap-4">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">{email}</span>.{" "}
          <button
            type="button"
            onClick={() => { setStep("email"); setOtp(""); clearError(); }}
            className="text-primary underline-offset-2 hover:underline"
          >
            Change
          </button>
        </div>
        <Field>
          <FieldLabel htmlFor="otp-code">6-digit code</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <KeyRound className="h-4 w-4" />
            </span>
            <Input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clearError(); }}
              required
              className="pl-9 tracking-[0.3em] font-mono text-lg"
              autoFocus
            />
          </div>
        </Field>
        <p className="text-xs text-muted-foreground">
          Code expires in 10 minutes.{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isSending}
            className={cn(
              "underline-offset-2",
              cooldown > 0 || isSending
                ? "text-muted-foreground cursor-not-allowed"
                : "text-primary hover:underline"
            )}
          >
            {isSending ? "Resending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </p>
        <Field>
          <Button
            type="submit"
            disabled={isVerifying || otp.length !== 6}
            className="w-full border-0 bg-primary text-white shadow-sm hover:opacity-90"
          >
            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isVerifying ? "Verifying..." : "Verify & Sign In"}
            {!isVerifying && <ArrowRight className="h-4 w-4" />}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

// ─── Main LoginForm ──────────────────────────────────────────────────────────

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [activeTab, setActiveTab] = useState<AuthTab>("password");
  const { user, isAuthenticated, isLoading, clearError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      router.push(user.role?.toUpperCase() === "SALES" ? "/sales-user" : "/");
    }
  }, [isAuthenticated, user, isLoading, router]);

  const handleTabChange = (tab: AuthTab) => {
    clearError();
    setActiveTab(tab);
  };

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-svh flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: { id: AuthTab; label: string }[] = [
    { id: "password", label: "Password" },
    { id: "otp", label: "Email OTP" },
  ];

  return (
    <div
      className={cn("grid h-screen w-full overflow-hidden md:grid-cols-2", className)}
      {...props}
    >
      {/* Left: form panel */}
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

          {/* Auth method tabs */}
          <div className="mb-5 flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "password" && <PasswordTab />}
          {activeTab === "otp" && <OtpTab />}

          <FieldDescription className="mt-4 text-center text-muted-foreground text-xs">
            For access, contact your KPT regional manager.
          </FieldDescription>

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
