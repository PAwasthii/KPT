"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Badge } from "@repo/ui/components/ui/badge";
import { Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import type { GstDetails } from "@/lib/api/types";

interface GstinInputProps {
  value: string;
  onChange: (value: string) => void;
  onVerified?: (details: GstDetails) => void;
  disabled?: boolean;
  label?: string;
}

interface GstVerifyResponse {
  success: boolean;
  data: GstDetails;
}

export function GstinInput({
  value,
  onChange,
  onVerified,
  disabled = false,
  label = "GSTIN",
}: GstinInputProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<GstDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidFormat = /^[0-9A-Z]{15}$/.test(value);
  const canVerify = isValidFormat && !disabled;

  function handleChange(raw: string) {
    const clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    onChange(clean);
    setVerified(null);
    setError(null);
  }

  async function handleVerify() {
    if (!canVerify) return;
    setVerifying(true);
    setError(null);
    setVerified(null);
    try {
      const res = await apiClient.get<GstVerifyResponse>("/api/gst/verify", {
        params: { gstin: value },
      });
      const details = res.data?.data ?? (res as any).data;
      setVerified(details);
      onVerified?.(details);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not verify GSTIN";
      setError(msg);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. 27AABCU9603R1ZM"
          maxLength={15}
          disabled={disabled}
          className="uppercase font-mono text-sm"
          aria-label={label}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleVerify}
          disabled={!canVerify || verifying}
        >
          {verifying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Verify"
          )}
        </Button>
      </div>

      {value && !isValidFormat && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Must be exactly 15 alphanumeric characters
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}

      {verified && (
        <div className="rounded-md border bg-muted/50 px-3 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {verified.legalName}
            </span>
            <Badge
              variant={verified.status === "Active" ? "default" : "secondary"}
              className="text-xs"
            >
              {verified.status}
            </Badge>
          </div>
          {verified.tradeName && verified.tradeName !== verified.legalName && (
            <p className="text-xs text-muted-foreground">
              Trade name: {verified.tradeName}
            </p>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
            {verified.city && <span>{verified.city}</span>}
            {verified.state && <span>{verified.state}</span>}
            {verified.panNumber && <span>PAN: {verified.panNumber}</span>}
          </div>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </p>
        </div>
      )}
    </div>
  );
}
