"use client";

import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Label,
} from "@repo/ui";
import { Users, MapPin, TrendingUp, Phone, Mail, Plus, Pencil, Upload, Download } from "lucide-react";
import {
  usePartners,
  useUpdatePartner,
  useActivatePartner,
  useEligibleApplications,
  useBulkImportPartners,
} from "../../hooks/useKpt";
import { useCurrency } from "../../contexts/CurrencyContext";
import { TaxRegistrationInput } from "./TaxRegistrationInput";
import { getDefaultTaxType } from "../../lib/kpt/tax-types";

interface ChannelPartner {
  id: number;
  code: string;
  name: string;
  type: "DISTRIBUTOR" | "DEALER" | "RETAILER";
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  region: string;
  crn?: string | null;
  currentMonthSales: number;
  ytdSales: number;
  targetAmount: number;
  creditLimit: number;
  outstandingPayment: number;
}

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
};

const TIER_STYLE: Record<string, string> = {
  BRONZE: "bg-blue-100 text-blue-700 border-blue-200",
  SILVER: "bg-gray-100 text-gray-600 border-gray-200",
  GOLD: "bg-amber-100 text-amber-700 border-amber-200",
  PLATINUM: "bg-violet-100 text-violet-700 border-violet-200",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
  SUSPENDED: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

const TYPE_LABEL: Record<string, string> = {
  DISTRIBUTOR: "Distributor",
  DEALER: "Dealer",
  RETAILER: "Retailer",
};

interface PartnerFormState {
  name: string;
  code: string;
  type: string;
  tier: string;
  contactName: string;
  countryCode: string;
  contactPhone: string;
  contactEmail: string;
  countryIso: string;
  pincode: string;
  locationDisplay: string;
  city: string;
  state: string;
  country: string;
  region: string;
  geoLat: string;
  geoLng: string;
  taxType: string;
  taxNumber: string;
  targetAmount: string;
}

const EMPTY_FORM: PartnerFormState = {
  name: "",
  code: "",
  type: "DEALER",
  tier: "BRONZE",
  contactName: "",
  countryCode: "+91",
  contactPhone: "",
  contactEmail: "",
  countryIso: "IN",
  pincode: "",
  locationDisplay: "",
  city: "",
  state: "",
  country: "",
  region: "",
  geoLat: "",
  geoLng: "",
  taxType: "GSTIN",
  taxNumber: "",
  targetAmount: "",
};

const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+1",   flag: "🇺🇸", name: "USA / Canada" },
  { code: "+44",  flag: "🇬🇧", name: "UK" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+33",  flag: "🇫🇷", name: "France" },
  { code: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "+86",  flag: "🇨🇳", name: "China" },
  { code: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
];

const LOCATION_COUNTRIES = [
  { iso: "IN", flag: "🇮🇳", name: "India" },
  { iso: "US", flag: "🇺🇸", name: "United States" },
  { iso: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { iso: "AU", flag: "🇦🇺", name: "Australia" },
  { iso: "AE", flag: "🇦🇪", name: "UAE" },
  { iso: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
  { iso: "SG", flag: "🇸🇬", name: "Singapore" },
  { iso: "MY", flag: "🇲🇾", name: "Malaysia" },
  { iso: "DE", flag: "🇩🇪", name: "Germany" },
  { iso: "FR", flag: "🇫🇷", name: "France" },
  { iso: "JP", flag: "🇯🇵", name: "Japan" },
  { iso: "CN", flag: "🇨🇳", name: "China" },
  { iso: "ZA", flag: "🇿🇦", name: "South Africa" },
  { iso: "BR", flag: "🇧🇷", name: "Brazil" },
  { iso: "PK", flag: "🇵🇰", name: "Pakistan" },
  { iso: "BD", flag: "🇧🇩", name: "Bangladesh" },
  { iso: "LK", flag: "🇱🇰", name: "Sri Lanka" },
  { iso: "NP", flag: "🇳🇵", name: "Nepal" },
];

type FormErrors = Partial<Record<keyof PartnerFormState, string>>;

function validateEmail(email: string): string {
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ? ""
    : "Enter a valid email address";
}

function validatePhone(phone: string): string {
  if (!phone) return "Phone number is required";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15)
    return "Enter a valid phone number (7–15 digits)";
  return "";
}

interface EligibleApplication {
  crn: string;
  firmName: string;
  ownerName: string;
  mobile: string;
  email: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  currentStage: number;
  status: string;
}

function PartnerFormDialog({
  trigger,
  title,
  initial,
  mode,
  onSubmit,
  isPending,
}: {
  trigger: React.ReactNode;
  title: string;
  initial?: PartnerFormState;
  mode?: "add" | "edit";
  onSubmit: (data: PartnerFormState, crn?: string) => void;
  isPending?: boolean;
}) {
  const isAddMode = mode !== "edit";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PartnerFormState>(initial ?? EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [selectedCrn, setSelectedCrn] = useState<string>("");
  const [appData, setAppData] = useState<EligibleApplication | null>(null);
  const userEditedLocation = useRef(false);
  const { symbol } = useCurrency();

  const { data: eligibleAppsData } = useEligibleApplications();
  const eligibleApps: EligibleApplication[] = eligibleAppsData?.data ?? [];

  function set(field: keyof PartnerFormState, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "countryIso") {
        next.taxType = getDefaultTaxType(value);
        next.taxNumber = "";
      }
      return next;
    });
    if (formErrors[field]) {
      setFormErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    }
    if (field === "locationDisplay") userEditedLocation.current = true;
    if (field === "pincode" || field === "countryIso") userEditedLocation.current = false;
  }

  function handleCrnSelect(crn: string) {
    setSelectedCrn(crn);
    if (!crn) {
      setAppData(null);
      setForm(EMPTY_FORM);
      return;
    }
    const app = eligibleApps.find((a) => a.crn === crn);
    if (!app) return;
    setAppData(app);
    setForm((f) => ({
      ...f,
      name: app.firmName,
      contactName: app.ownerName,
      contactPhone: app.mobile,
      contactEmail: app.email ?? "",
      pincode: app.pincode ?? "",
      city: app.city ?? "",
      state: app.state ?? "",
      country: "India",
      countryIso: "IN",
      countryCode: "+91",
      locationDisplay: [app.city, app.state, "India"].filter(Boolean).join(", "),
    }));
  }

  useEffect(() => {
    if (open) {
      setForm(initial ?? EMPTY_FORM);
      setFormErrors({});
      userEditedLocation.current = false;
      setLookupError("");
      if (isAddMode) {
        setSelectedCrn("");
        setAppData(null);
      }
    }
  }, [open]);

  useEffect(() => {
    if (!form.pincode || form.pincode.length < 3) {
      setLookupError("");
      return;
    }
    const t = setTimeout(async () => {
      if (userEditedLocation.current) return;
      setLookupLoading(true);
      setLookupError("");
      try {
        const resp = await fetch(`https://api.zippopotam.us/${form.countryIso.toLowerCase()}/${form.pincode}`);
        if (!resp.ok) {
          setLookupError("Postal code not found");
          return;
        }
        const json = await resp.json();
        const place = json.places?.[0];
        if (!place) {
          setLookupError("No location data");
          return;
        }
        setForm((f) => ({
          ...f,
          city: place["place name"] ?? "",
          state: place["state"] ?? "",
          country: json["country"] ?? "",
          geoLat: place["latitude"] ?? "",
          geoLng: place["longitude"] ?? "",
          ...(!userEditedLocation.current && {
            locationDisplay: [place["place name"], place["state"], json["country abbreviation"]]
              .filter(Boolean).join(", "),
          }),
        }));
      } catch {
        setLookupError("Lookup failed");
      } finally {
        setLookupLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.pincode, form.countryIso]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isAddMode && !selectedCrn) {
      setFormErrors((f) => ({ ...f, name: "Select a partner application first" }));
      return;
    }
    const errors: FormErrors = {};
    const phoneErr = validatePhone(form.contactPhone);
    if (phoneErr) errors.contactPhone = phoneErr;
    const emailErr = validateEmail(form.contactEmail);
    if (emailErr) errors.contactEmail = emailErr;
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    onSubmit(form, isAddMode ? selectedCrn : undefined);
    setOpen(false);
  }

  const readOnly = isAddMode && !!appData;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 space-y-4 py-2 pr-1">

          {/* CRN selector — only in add mode */}
          {isAddMode && (
            <div className="space-y-1.5">
              <Label>Partner Application (CRN) <span className="text-red-500">*</span></Label>
              <Select value={selectedCrn} onValueChange={handleCrnSelect}>
                <SelectTrigger className={!selectedCrn ? "border-amber-400 text-muted-foreground" : ""}>
                  <SelectValue placeholder="Select an approved application…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleApps.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No eligible applications found</div>
                  )}
                  {eligibleApps.map((app) => (
                    <SelectItem key={app.crn} value={app.crn}>
                      <span className="font-mono text-xs text-muted-foreground mr-2">{app.crn}</span>
                      {app.firmName}
                      {app.city ? ` — ${app.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCrn && (
                <p className="text-xs text-muted-foreground">
                  Only applications at stage 4+ not yet activated are shown.
                </p>
              )}
            </div>
          )}

          {/* Read-only application info when CRN selected in add mode */}
          {isAddMode && appData && (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-20 shrink-0">Firm</span>
                <span className="font-medium">{appData.firmName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-20 shrink-0">Owner</span>
                <span>{appData.ownerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-20 shrink-0">Mobile</span>
                <span>{appData.mobile}</span>
              </div>
              {appData.email && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-20 shrink-0">Email</span>
                  <span>{appData.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs w-20 shrink-0">Location</span>
                <span>{[appData.city, appData.state].filter(Boolean).join(", ") || "—"}</span>
              </div>
            </div>
          )}

          {/* Main form fields — hidden in add mode until CRN is chosen */}
          {(!isAddMode || selectedCrn) && (
            <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                  <SelectItem value="DEALER">Dealer</SelectItem>
                  <SelectItem value="RETAILER">Retailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="PLATINUM">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!readOnly && (
            <>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact Name</Label>
            <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <div className="flex">
                <Select value={form.countryCode} onValueChange={(v) => set("countryCode", v)}>
                  <SelectTrigger className="w-[86px] shrink-0 rounded-r-none border-r-0 focus:ring-0 gap-1">
                    <span className="flex items-center gap-1 text-sm leading-none">
                      <span>{COUNTRY_CODES.find(c => c.code === form.countryCode)?.flag ?? "🌐"}</span>
                      <span>{form.countryCode}</span>
                    </span>
                  </SelectTrigger>
                  <SelectContent className="min-w-[220px]">
                    {COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  onBlur={() => { const err = validatePhone(form.contactPhone); setFormErrors((f) => ({ ...f, contactPhone: err || undefined })); }}
                  className={`rounded-l-none ${formErrors.contactPhone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  placeholder="Phone number"
                />
              </div>
              {formErrors.contactPhone && <p className="text-xs text-red-500">{formErrors.contactPhone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="text"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                onBlur={() => { const err = validateEmail(form.contactEmail); setFormErrors((f) => ({ ...f, contactEmail: err || undefined })); }}
                className={formErrors.contactEmail ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="email@example.com"
              />
              {formErrors.contactEmail && <p className="text-xs text-red-500">{formErrors.contactEmail}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <Select value={form.countryIso} onValueChange={(v) => set("countryIso", v)}>
                <SelectTrigger className="gap-1">
                  <span className="flex items-center gap-1 text-sm leading-none">
                    <span>{LOCATION_COUNTRIES.find(c => c.iso === form.countryIso)?.flag ?? "🌐"}</span>
                    <span>{form.countryIso}</span>
                  </span>
                </SelectTrigger>
                <SelectContent className="min-w-[200px]">
                  {LOCATION_COUNTRIES.map((c) => (
                    <SelectItem key={c.iso} value={c.iso}>
                      {c.flag} {c.iso} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Input
                  value={form.pincode}
                  onChange={(e) => set("pincode", e.target.value)}
                  placeholder="Postal / PIN code"
                />
                {lookupLoading && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                    …
                  </span>
                )}
              </div>
            </div>
            <Input
              value={form.locationDisplay}
              onChange={(e) => set("locationDisplay", e.target.value)}
              placeholder="City, State, Country (auto-filled from postal code)"
              className="text-sm"
            />
            {lookupError && <p className="text-xs text-red-500">{lookupError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tax Registration</Label>
            <TaxRegistrationInput
              countryIso={form.countryIso}
              taxType={form.taxType}
              taxNumber={form.taxNumber}
              onTaxTypeChange={(v) => set("taxType", v)}
              onTaxNumberChange={(v) => set("taxNumber", v)}
              onVerified={(result) => {
                if (result.legalName) {
                  setForm((f) => ({ ...f, name: f.name || result.legalName! }));
                }
              }}
            />
          </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="e.g. West, South" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount ({symbol})</Label>
              <Input
                type="number"
                value={form.targetAmount}
                onChange={(e) => set("targetAmount", e.target.value)}
                placeholder="e.g. 3000000"
              />
            </div>
          </div>
          {readOnly && (
            <div className="space-y-1.5">
              <Label>Partner Code (optional)</Label>
              <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="Auto-generated if left blank" />
            </div>
          )}
            </>
          )}

          </div>{/* end scrollable body */}
          <DialogFooter className="shrink-0 border-t pt-4 pb-1 bg-background">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || (isAddMode && !selectedCrn)}>
              {isPending ? "Saving..." : isAddMode ? "Activate Partner" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const PARTNER_HEADER_MAP: Record<string, string> = {
  "name": "name",
  "partner name": "name",
  "code": "code",
  "partner code": "code",
  "type": "type",
  "partner type": "type",
  "tier": "tier",
  "contact name": "contactName",
  "contactname": "contactName",
  "contact": "contactName",
  "phone": "contactPhone",
  "contact phone": "contactPhone",
  "mobile": "contactPhone",
  "email": "contactEmail",
  "contact email": "contactEmail",
  "country": "country",
  "city": "city",
  "state": "state",
  "region": "region",
  "gstin": "gstin",
  "gst": "gstin",
  "gst number": "gstin",
  "target": "targetAmount",
  "target amount": "targetAmount",
  "targetamount": "targetAmount",
};

function ImportPartnersDialog() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportPartners();

  const parseFile = (file: File) => {
    setParseError("");
    setPreview(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0] ?? ""];
        if (!ws) { setParseError("Could not read sheet from file."); return; }
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) { setParseError("File must have a header row and at least one data row."); return; }

        const headers = (rows[0] as string[]).map((h) => String(h ?? "").toLowerCase().trim());
        const mapped = rows.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => {
            const field = PARTNER_HEADER_MAP[h];
            if (field) obj[field] = row[i] ?? "";
          });
          return obj;
        }).filter((r) => r.name);

        if (mapped.length === 0) {
          setParseError("No valid rows found. Check that a 'Name' column exists.");
          return;
        }
        setPreview(mapped);
      } catch {
        setParseError("Could not parse file. Please use a valid .xlsx or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    await bulkImport.mutateAsync(preview);
    setPreview(null);
    setFileName("");
    setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setFileName("");
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Code", "Type", "Tier", "Contact Name", "Phone", "Email", "Country", "State", "City", "GSTIN", "Target Amount"],
      ["Shree Ganesh Tools", "DIST-MH-001", "DISTRIBUTOR", "GOLD", "Suresh Patil", "9823456789", "suresh@sgtools.in", "India", "Maharashtra", "Pune", "27AABCS1429B1Z5", 3600000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Partners");
    XLSX.writeFile(wb, "kpt_partners_template.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-1.5">
          <Upload className="h-4 w-4" /> Import Partners
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Partners from Excel / CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload an <span className="font-medium">.xlsx</span> or <span className="font-medium">.csv</span> file.
            Existing partners (matched by Code or Name) will be updated; new ones will be created.
          </p>
          <Button size="sm" variant="ghost" className="text-xs underline p-0 h-auto" onClick={downloadTemplate}>
            <Download className="h-3 w-3 mr-1" /> Download template
          </Button>
          <div>
            <Label>Select File</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
              className="cursor-pointer"
            />
          </div>
          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
          {preview && (
            <div className="rounded-md border p-3 bg-muted/40 text-sm space-y-1">
              <p className="font-medium">Ready to import from <span className="text-primary">{fileName}</span></p>
              <p className="text-muted-foreground">{preview.length} partner{preview.length !== 1 ? "s" : ""} detected</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview || bulkImport.isPending}>
            {bulkImport.isPending ? "Importing…" : `Import ${preview ? preview.length + " partners" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChannelPartnersPage() {
  const { data, isLoading } = usePartners({ limit: 100 });
  const activatePartner = useActivatePartner();
  const updatePartner = useUpdatePartner();
  const { symbol, currency, convert } = useCurrency();
  const fmt = (n: number) => currency === 'INR'
    ? `${symbol}${(n / 100000).toFixed(1)} L`
    : `${symbol}${convert(n).toLocaleString()}`;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
        <div className="h-10 w-64 rounded bg-muted animate-pulse" />
        <div className="rounded-lg border divide-y">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const partners: ChannelPartner[] = data?.data ?? [];
  const distributors = partners.filter((p) => p.type === "DISTRIBUTOR").length;
  const dealers = partners.filter((p) => p.type === "DEALER").length;

  const avgAchievement =
    partners.length > 0
      ? Math.round(
          partners.reduce((sum, p) => {
            const pct = p.targetAmount > 0 ? (p.ytdSales / p.targetAmount) * 100 : 0;
            return sum + pct;
          }, 0) / partners.length
        )
      : 0;

  function handleCreate(form: PartnerFormState, crn?: string) {
    if (!crn) return;
    activatePartner.mutate({
      crn,
      data: {
        type: form.type,
        tier: form.tier || undefined,
        region: form.region || undefined,
        targetAmount: Number(form.targetAmount) || 0,
        code: form.code || undefined,
      },
    });
  }

  function handleUpdate(id: number, form: PartnerFormState) {
    updatePartner.mutate({
      id,
      data: {
        ...form,
        targetAmount: Number(form.targetAmount) || 0,
        geoLat: form.geoLat ? Number(form.geoLat) : undefined,
        geoLng: form.geoLng ? Number(form.geoLng) : undefined,
        gstin: form.taxType === "GSTIN" ? form.taxNumber || undefined : undefined,
      },
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Channel Partners</h1>
          <p className="text-sm text-muted-foreground">Manage your KPT distribution network</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportPartnersDialog />
          <PartnerFormDialog
          title="Add Channel Partner"
          mode="add"
          trigger={
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Partner
            </Button>
          }
          onSubmit={handleCreate}
          isPending={activatePartner.isPending}
        />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Partners", value: partners.length, icon: Users, color: "text-primary" },
          { label: "Distributors", value: distributors, icon: MapPin, color: "text-blue-600" },
          { label: "Dealers", value: dealers, icon: Users, color: "text-purple-600" },
          { label: "Avg Achievement", value: `${avgAchievement}%`, icon: TrendingUp, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Partners table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-primary uppercase tracking-wide">
            All Channel Partners
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["Partner", "CRN", "Type", "Pincode", "MTD Sales", "YTD Sales", "Target", "Achievement", "Tier", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {partners.map((p) => {
                  const pct =
                    p.targetAmount > 0
                      ? Math.min(100, Math.round((p.ytdSales / p.targetAmount) * 100))
                      : 0;
                  const pctColor =
                    pct >= 90 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-400";
                  const pctText =
                    pct >= 90
                      ? "text-green-600"
                      : pct >= 75
                      ? "text-amber-600"
                      : "text-red-500";

                  const pa = p as any;
                  const inferredIso = LOCATION_COUNTRIES.find(
                    (c) => c.name.toLowerCase() === (pa.country ?? "").toLowerCase()
                  )?.iso ?? "IN";
                  const editInitial: PartnerFormState = {
                    name: p.name,
                    code: p.code,
                    type: p.type,
                    tier: p.tier,
                    contactName: p.contactName,
                    countryCode: pa.countryCode ?? "+91",
                    contactPhone: p.contactPhone,
                    contactEmail: p.contactEmail,
                    countryIso: inferredIso,
                    pincode: pa.pincode ?? "",
                    locationDisplay: [pa.city, pa.state, pa.country].filter(Boolean).join(", "),
                    city: pa.city ?? "",
                    state: pa.state ?? "",
                    country: pa.country ?? "",
                    region: pa.region ?? "",
                    geoLat: pa.geoLat != null ? String(pa.geoLat) : "",
                    geoLng: pa.geoLng != null ? String(pa.geoLng) : "",
                    taxType: pa.taxType ?? (pa.gstin ? "GSTIN" : getDefaultTaxType(inferredIso)),
                    taxNumber: pa.taxNumber ?? pa.gstin ?? "",
                    targetAmount: String(p.targetAmount),
                  };

                  return (
                    <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-4 py-3 min-w-[180px]">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-muted-foreground">
                          {p.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {p.contactPhone}
                            </span>
                          )}
                          {p.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {p.contactEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {p.crn || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {TYPE_LABEL[p.type] ?? p.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {(p as any).pincode || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {fmt(p.currentMonthSales)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {fmt(p.ytdSales)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {fmt(p.targetAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pctColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${pctText}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium border rounded-full px-2 py-0.5 ${TIER_STYLE[p.tier] ?? ""}`}
                        >
                          {TIER_LABEL[p.tier] ?? p.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[p.status] ?? ""}`}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PartnerFormDialog
                          title="Edit Partner"
                          mode="edit"
                          trigger={
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          }
                          initial={editInitial}
                          onSubmit={(form) => handleUpdate(p.id, form)}
                          isPending={updatePartner.isPending}
                        />
                      </td>
                    </tr>
                  );
                })}
                {partners.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No partners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
