"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createCompany } from "@/actions/companies";
import { createContact } from "@/actions/contacts";

// ── Parsed row types ──

type ImportRow = {
  // Company fields
  company_name: string;
  industry?: string;
  company_city?: string;
  company_state?: string;
  revenue_range?: string;
  website?: string;
  employee_count?: number;
  description?: string;
  company_phone?: string;
  linkedin_company?: string;
  facebook_company?: string;
  twitter_company?: string;
  email_domain?: string;
  // Contact fields
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  linkedin_contact?: string;
  contact_city?: string;
  contact_state?: string;
  // Import status
  status: "pending" | "success" | "error";
  error?: string;
};

// ── CSV header → internal field mapping ──
// Covers every column from the user's Apollo/ZoomInfo/generic CSVs

const HEADER_MAP: Record<string, string> = {
  // ─── Company Name ───
  company_name: "company_name", company: "company_name", name: "company_name",
  business_name: "company_name", business: "company_name",
  organization: "company_name", account_name: "company_name",

  // ─── Contact: First Name ───
  first_name: "first_name", firstname: "first_name", "first": "first_name",
  given_name: "first_name",

  // ─── Contact: Last Name ───
  last_name: "last_name", lastname: "last_name", "last": "last_name",
  surname: "last_name", family_name: "last_name",

  // ─── Contact: Job Title ───
  job_title: "title", title: "title", position: "title", role: "title",

  // ─── Contact: Email ───
  email_address: "email", email: "email", "e-mail": "email",
  work_email: "email", business_email: "email", contact_email: "email",

  // ─── Contact: Phone ───
  direct_phone_number: "phone", direct_phone: "phone", phone: "phone",
  phone_number: "phone", work_phone: "phone", business_phone: "phone",
  contact_phone: "phone",

  // ─── Contact: Mobile ───
  mobile_phone: "mobile", mobile: "mobile", cell: "mobile",
  cell_phone: "mobile", cellular: "mobile",

  // ─── Contact: LinkedIn ───
  linkedin_contact_profile_url: "linkedin_contact",
  linkedin_url: "linkedin_contact", linkedin_profile: "linkedin_contact",
  linkedin: "linkedin_contact", contact_linkedin: "linkedin_contact",

  // ─── Contact: Location ───
  person_city: "contact_city", contact_city: "contact_city",
  person_state: "contact_state", contact_state: "contact_state",

  // ─── Email Domain ───
  email_domain: "email_domain",

  // ─── Industry ───
  industry: "industry", sector: "industry", category: "industry",
  business_type: "industry", vertical: "industry",

  // ─── Company: Location ───
  location: "company_city", // combined — will be split
  address: "company_city",
  city: "company_city", company_city: "company_city",
  state: "company_state", company_state: "company_state",
  location_city: "company_city", location_state: "company_state",
  company_hq_state: "company_state", hq_state: "company_state",
  region: "company_state",

  // ─── Company: Website ───
  website: "website", url: "website", site: "website",
  domain: "website", website_url: "website", company_website: "website",

  // ─── Company: Revenue ───
  revenue: "revenue_range", revenue_range: "revenue_range",
  "revenue_range_(in_usd)": "revenue_range",
  "revenue_(in_000s_usd)": "revenue_range",
  annual_revenue: "revenue_range", sales: "revenue_range",

  // ─── Company: Employees ───
  employees: "employee_count", employee_count: "employee_count",
  headcount: "employee_count", company_size: "employee_count",
  size: "employee_count",

  // ─── Company: Phone ───
  company_hq_phone: "company_phone", company_phone: "company_phone",
  main_phone: "company_phone", office_phone: "company_phone",

  // ─── Company: Social ───
  linkedin_company_profile_url: "linkedin_company",
  company_linkedin: "linkedin_company",
  facebook_company_profile_url: "facebook_company",
  company_facebook: "facebook_company",
  twitter_company_profile_url: "twitter_company",
  company_twitter: "twitter_company",

  // ─── Description ───
  description: "description", notes: "description", about: "description",
  summary: "description",
};

/**
 * Parse a CSV line respecting quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export default function ImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }

      const rawHeaders = parseCSVLine(lines[0]);
      const mapping: Record<number, string> = {};
      const unmapped: string[] = [];

      rawHeaders.forEach((h, idx) => {
        const normalized = h
          .toLowerCase()
          .replace(/['"]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[()]/g, "")
          .trim();
        const mapped = HEADER_MAP[normalized] || null;
        if (mapped) {
          // Avoid duplicate mappings — first occurrence wins
          if (!Object.values(mapping).includes(mapped) || mapped === "first_name") {
            mapping[idx] = mapped;
          }
        } else if (h.trim()) {
          unmapped.push(h.trim());
        }
      });

      setUnmappedHeaders(unmapped);

      const hasCompanyName = Object.values(mapping).includes("company_name");
      if (!hasCompanyName) {
        toast.error(
          `CSV must have a 'Company Name' or 'Name' column. Found: ${rawHeaders.join(", ")}`
        );
        return;
      }

      const fields = [...new Set(Object.values(mapping))];
      setDetectedFields(fields);

      // Parse data rows
      const parsed: ImportRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const row: any = { status: "pending" };

        for (const [idxStr, field] of Object.entries(mapping)) {
          const idx = parseInt(idxStr);
          const value = cols[idx]?.replace(/^"|"$/g, "").trim() || "";
          if (!value) continue;

          if (field === "employee_count") {
            const num = parseInt(value.replace(/[^0-9]/g, ""));
            if (!isNaN(num)) row.employee_count = num;
          } else {
            row[field] = value;
          }
        }

        // Use contact city/state as company city/state if company location is missing
        if (!row.company_city && row.contact_city) row.company_city = row.contact_city;
        if (!row.company_state && row.contact_state) row.company_state = row.contact_state;

        if (row.company_name) {
          parsed.push(row as ImportRow);
        }
      }

      setRows(parsed);

      const hasContacts = parsed.some((r) => r.first_name || r.email || r.phone);
      const msg = hasContacts
        ? `Parsed ${parsed.length} companies with contact data`
        : `Parsed ${parsed.length} companies`;
      toast.success(msg);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    setImporting(true);
    setImported(0);
    const updated = [...rows];
    let successCount = 0;

    for (let i = 0; i < updated.length; i++) {
      try {
        const row = updated[i];

        // Step 1: Create company
        const company = await createCompany({
          name: row.company_name,
          industry: row.industry || null,
          location_city: row.company_city || null,
          location_state: row.company_state || null,
          revenue_range: row.revenue_range || null,
          website: row.website || row.email_domain ? `https://${row.email_domain}` : null,
          employee_count: row.employee_count || null,
          description: row.description || null,
          source: "import",
          status: "new",
        });

        // Step 2: Create contact if we have contact data
        const hasContactData = row.first_name || row.last_name || row.email || row.phone;
        if (hasContactData && company?.id) {
          try {
            await createContact({
              company_id: company.id,
              first_name: row.first_name || "Unknown",
              last_name: row.last_name || "",
              title: row.title || null,
              email: row.email || null,
              phone: row.phone || row.mobile || row.company_phone || null,
              linkedin_url: row.linkedin_contact || null,
              role_type: inferRoleType(row.title),
            });
          } catch {
            // Contact creation failed but company was created — still count as success
            console.error(`[Import] Contact creation failed for company ${row.company_name}`);
          }
        }

        updated[i] = { ...updated[i], status: "success" };
        successCount++;
      } catch (err: any) {
        updated[i] = { ...updated[i], status: "error", error: err.message || "Failed" };
      }
      setImported(i + 1);
      if (i % 10 === 0 || i === updated.length - 1) {
        setRows([...updated]);
      }
    }
    setRows([...updated]);
    toast.success(`Imported ${successCount} of ${updated.length} companies with contacts`);
    setImporting(false);
  }

  const successCount = rows.filter((r) => r.status === "success").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const contactCount = rows.filter((r) => r.first_name || r.email).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/sourcing"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Sourcing
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Companies & Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV to import companies with contact info (names, emails, phones)
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border/50 p-8">
            <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload CSV</p>
              <p className="text-xs text-muted-foreground">
                Supports Apollo, ZoomInfo, and custom CSVs. Auto-detects columns.
              </p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {detectedFields.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Mapped:</span>
                {detectedFields.map((field) => (
                  <Badge key={field} variant="secondary" className="text-[10px]">
                    {field.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
              {unmappedHeaders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Skipped:</span>
                  {unmappedHeaders.map((h) => (
                    <Badge key={h} variant="outline" className="text-[10px] text-muted-foreground">
                      {h}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">
                  Preview ({rows.length} companies{contactCount > 0 ? `, ${contactCount} with contacts` : ""})
                </CardTitle>
                {(successCount > 0 || errorCount > 0) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {successCount} imported{errorCount > 0 && `, ${errorCount} errors`}
                  </p>
                )}
              </div>
              <Button size="sm" onClick={runImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing {imported}/{rows.length}
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-2">#</th>
                    <th className="p-2">Company</th>
                    <th className="p-2">Contact</th>
                    <th className="p-2">Email / Phone</th>
                    <th className="p-2">Location</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="p-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="p-2">
                        <span className="font-medium">{row.company_name}</span>
                        {row.industry && (
                          <span className="ml-1 text-xs text-muted-foreground">· {row.industry}</span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {row.first_name || row.last_name ? (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                            {row.title && <span className="text-[10px]">({row.title})</span>}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        <div>{row.email || "—"}</div>
                        {(row.phone || row.mobile) && (
                          <div>{row.phone || row.mobile}</div>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {[row.company_city || row.contact_city, row.company_state || row.contact_state]
                          .filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="p-2">
                        {row.status === "pending" && (
                          <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                        )}
                        {row.status === "success" && (
                          <Badge className="bg-green-500/10 text-green-500 text-[10px]">
                            <CheckCircle2 className="mr-1 h-3 w-3" />Done
                          </Badge>
                        )}
                        {row.status === "error" && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertCircle className="mr-1 h-3 w-3" />{row.error}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Infer the contact role type from their job title.
 */
function inferRoleType(title: string | undefined): string {
  if (!title) return "other";
  const t = title.toLowerCase();
  if (t.includes("owner") || t.includes("founder") || t.includes("ceo") || t.includes("president") || t.includes("principal")) {
    return "owner";
  }
  if (t.includes("cfo") || t.includes("controller") || t.includes("finance")) {
    return "cfo";
  }
  if (t.includes("broker")) {
    return "broker";
  }
  return "other";
}
