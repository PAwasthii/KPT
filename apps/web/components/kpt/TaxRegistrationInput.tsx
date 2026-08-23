"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@repo/ui";
import { Loader2, CheckCircle2, AlertCircle, Building2, Info, MapPin } from "lucide-react";
import apiClient from "@/lib/api/client";
import {
  getTaxTypesForCountry,
  TAX_TYPE_CONFIGS,
  type TaxVerifyResult,
} from "@/lib/kpt/tax-types";

interface Props {
  countryIso: string;
  taxType: string;
  taxNumber: string;
  onTaxTypeChange: (type: string) => void;
  onTaxNumberChange: (number: string) => void;
  onVerified?: (result: TaxVerifyResult) => void;
}

interface ApiResponse {
  success: boolean;
  data: TaxVerifyResult;
}

export function TaxRegistrationInput({
  countryIso,
  taxType,
  taxNumber,
  onTaxTypeChange,
  onTaxNumberChange,
  onVerified,
}: Props) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<TaxVerifyResult | null>(null);

  const config = TAX_TYPE_CONFIGS[taxType] ?? TAX_TYPE_CONFIGS.OTHER!;
  const availableTypes = getTaxTypesForCountry(countryIso);

  const cleanedNumber =
    taxType === "GSTIN"
      ? taxNumber.toUpperCase().replace(/[^0-9A-Z]/g, "")
      : taxNumber;

  const isValidFormat = config.format ? config.format.test(cleanedNumber) : true;
  const canVerify = config.canVerify && cleanedNumber.length >= 5 && isValidFormat;

  function handleTypeChange(type: string) {
    onTaxTypeChange(type);
    onTaxNumberChange("");
    setResult(null);
  }

  function handleNumberChange(raw: string) {
    let clean = raw;
    if (taxType === "GSTIN") {
      clean = raw.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, config.maxLength ?? 15);
    } else if (config.maxLength) {
      clean = raw.slice(0, config.maxLength);
    }
    onTaxNumberChange(clean);
    setResult(null);
  }

  async function handleVerify() {
    if (!canVerify) return;
    setVerifying(true);
    setResult(null);
    try {
      const resp = await apiClient.post<ApiResponse>("/api/tax/verify", {
        taxType,
        taxNumber: cleanedNumber,
        countryIso,
      });
      const data = resp.data?.data ?? (resp as any).data;
      setResult(data);
      if (data?.status === "verified") onVerified?.(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Verification failed";
      setResult({ status: "error", message: msg });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Tax type selector */}
      <Select value={taxType} onValueChange={handleTypeChange}>
        <SelectTrigger className="h-8 text-xs text-muted-foreground">
          <span>{config.label}</span>
        </SelectTrigger>
        <SelectContent>
          {availableTypes.map((t) => (
            <SelectItem key={t.key} value={t.key} className="text-sm">
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Number input + Verify button */}
      <div className="flex gap-2">
        <Input
          value={taxType === "GSTIN" ? cleanedNumber : taxNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={config.placeholder}
          maxLength={config.maxLength}
          className={`font-mono text-sm ${taxType === "GSTIN" ? "uppercase" : ""}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={handleVerify}
          disabled={!canVerify || verifying}
        >
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </Button>
      </div>

      {/* Format error */}
      {taxNumber && config.format && !isValidFormat && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Invalid format for {config.shortLabel}
        </p>
      )}

      {/* Verification unavailable notice — always shown for non-verifiable types */}
      {!config.canVerify && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Verification unavailable for this tax type
        </p>
      )}

      {/* Result card */}
      {result && <VerifyResultCard result={result} />}
    </div>
  );
}

function VerifyResultCard({ result }: { result: TaxVerifyResult }) {
  if (result.status === "verified") {
    return (
      <div className="rounded-md border bg-muted/50 px-3 py-2 space-y-1">
        {result.legalName && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>{result.legalName}</span>
          </div>
        )}
        {result.tradeName && result.tradeName !== result.legalName && (
          <p className="text-xs text-muted-foreground">
            Trade name: {result.tradeName}
          </p>
        )}
        {result.address && (
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{result.address}</span>
          </p>
        )}
        {result.businessStatus && (
          <p className="text-xs text-muted-foreground">
            Status: {result.businessStatus}
          </p>
        )}
        {result.registrationDate && (
          <p className="text-xs text-muted-foreground">
            Registered: {result.registrationDate}
          </p>
        )}
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {result.message ?? "Verified"}
        </p>
      </div>
    );
  }

  if (result.status === "manual") {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        {result.message}
      </p>
    );
  }

  return (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {result.message ?? "Verification failed"}
    </p>
  );
}
