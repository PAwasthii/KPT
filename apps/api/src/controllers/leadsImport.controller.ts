import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { prisma, LeadStatus, LeadSource } from "@repo/db";
import { handleError, handleValidationError } from "../utils/errorHandler.js";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { buildFullName, splitFullName } from "../utils/nameHelpers.js";
import {
  isValidNameForImport,
  isValidPhoneForImport,
  isValidEmailForImport,
  isValidPincodeForImport,
  isValidCompanyForImport,
} from "../utils/validators.js";
// Note: Avoid importing enums from @prisma/client here to keep build compatible

export class LeadsImportController {
  private getTemplateHeaders(): string[] {
    return [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Company Name",
      "City",
      "State",
      "Pincode",
      "Status",
    ];
  }

  async downloadTemplate(req: Request, res: Response) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Leads");
    const headers = this.getTemplateHeaders();
    sheet.columns = headers.map((header) => ({
      header,
      key: header.toLowerCase().replace(/\s+/g, ""),
    }));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leads-template.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  async downloadTemplateCsv(req: Request, res: Response) {
    const headers = this.getTemplateHeaders();
    const csvContent = stringify([headers], {
      header: false,
      quoted: true,
      quoted_empty: true,
      bom: true,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leads-template.csv"`
    );
    res.send(csvContent);
  }

  private detectFileType(file: any): "xlsx" | "csv" {
    const filename = file.originalname || "";
    const mimetype = file.mimetype || "";

    // Check by extension first
    if (filename.toLowerCase().endsWith(".csv")) {
      return "csv";
    }
    if (filename.toLowerCase().endsWith(".xlsx")) {
      return "xlsx";
    }

    // Check by MIME type
    if (mimetype === "text/csv" || mimetype === "application/csv") {
      return "csv";
    }
    if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return "xlsx";
    }

    // Default to xlsx for backward compatibility
    return "xlsx";
  }

  private parseCsvFile(buffer: Buffer): {
    headerMap: Record<string, number>;
    rows: any[][];
  } {
    const records = parse(buffer, {
      columns: false,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    if (records.length === 0) {
      throw new Error("Empty CSV file");
    }

    const headerRow = records[0];
    const headerMap: Record<string, number> = {};
    headerRow.forEach((header: string, index: number) => {
      const normalized = String(header || "")
        .trim()
        .toLowerCase();
      headerMap[normalized] = index + 1; // 1-based like Excel
    });

    return {
      headerMap,
      rows: records.slice(1), // Skip header row
    };
  }

  /**
   * Validate lead fields according to import rules
   * Returns an array of error messages (empty if all validations pass)
   */
  private validateLeadFields(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    companyName: string,
    pincode: string
  ): string[] {
    const errors: string[] = [];

    // Validate First Name - must be non-numeric string
    if (!isValidNameForImport(firstName)) {
      errors.push("First Name must be a non-numeric string");
    }

    // Validate Last Name - must be non-numeric string if provided
    if (lastName && !isValidNameForImport(lastName)) {
      errors.push("Last Name must be a non-numeric string");
    }

    // Validate Phone - must be exactly 10 digits if provided
    if (phone && !isValidPhoneForImport(phone)) {
      errors.push("Phone Number must be exactly 10 digits");
    }

    // Validate Email - must be valid email format if provided
    if (email && !isValidEmailForImport(email)) {
      errors.push("Email must be a valid email address");
    }

    // Validate Company - must be valid string if provided
    if (companyName && !isValidCompanyForImport(companyName)) {
      errors.push("Company must be a valid string");
    }

    // Validate Pincode - must be exactly 6 digits if provided
    if (pincode && !isValidPincodeForImport(pincode)) {
      errors.push("Pincode must be exactly 6 digits");
    }

    return errors;
  }

  async importLeads(req: Request, res: Response) {
    try {
      const file = (req as any).file as any | undefined;
      if (!file) {
        return handleValidationError(
          res,
          "No file uploaded",
          "file",
          "Import leads"
        );
      }

      const fileType = this.detectFileType(file);
      if (!["xlsx", "csv"].includes(fileType)) {
        return handleValidationError(
          res,
          "Unsupported file format. Please use .xlsx or .csv",
          "file",
          "Import leads"
        );
      }

      let headerMap: Record<string, number> = {};
      let rowCount = 0;
      let getCell: (row: number, key: string) => string;

      if (fileType === "csv") {
        const { headerMap: csvHeaderMap, rows } = this.parseCsvFile(
          file.buffer
        );
        headerMap = csvHeaderMap;
        rowCount = rows.length + 1; // +1 for header row

        getCell = (row: number, key: string) => {
          const col = headerMap[key];
          if (col == null || row < 2) return ""; // Row 1 is header
          const rowIndex = row - 2; // Convert to 0-based index
          if (rowIndex < 0 || rowIndex >= rows.length) return "";
          const rowData = rows[rowIndex];
          if (!rowData) return "";
          const cellIndex = col - 1; // Convert to 0-based index
          if (cellIndex < 0 || cellIndex >= rowData.length) return "";
          const val = rowData[cellIndex];
          return val == null ? "" : String(val).trim();
        };
      } else {
        // Excel parsing
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file.buffer);
        const ws = workbook.worksheets[0];
        if (!ws) {
          return handleValidationError(
            res,
            "Empty workbook",
            "file",
            "Import leads"
          );
        }

        const headerRow = ws.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          const header = String(cell.value || "")
            .trim()
            .toLowerCase();
          headerMap[header] = colNumber;
        });

        const normalizeCellValue = (val: any): string => {
          if (val == null) return "";
          if (typeof val === "string") return val.trim();
          if (typeof val === "number") return String(val);
          if (val instanceof Date) return val.toISOString();
          // ExcelJS hyperlink object: { text: string, hyperlink: string }
          if (
            typeof val === "object" &&
            "text" in val &&
            typeof (val as any).text === "string"
          ) {
            return ((val as any).text as string).trim();
          }
          // ExcelJS rich text: { richText: [{ text: string, ... }] }
          if (
            typeof val === "object" &&
            "richText" in val &&
            Array.isArray((val as any).richText)
          ) {
            return (val as any).richText
              .map((r: any) => r?.text || "")
              .join("")
              .trim();
          }
          return "";
        };

        rowCount = ws.rowCount;
        getCell = (row: number, key: string) => {
          const col = headerMap[key];
          if (!col) return "";
          const val = ws.getRow(row).getCell(col).value;
          return normalizeCellValue(val);
        };
      }

      let insertedCount = 0;
      let skippedDuplicates = 0;
      const errors: Array<{ row: number; reason: string }> = [];
      const skippedRows: Array<{
        row: number;
        firstName: string;
        lastName: string;
        fullName: string;
        email: string;
        phone: string;
        companyName: string;
        city: string;
        state: string;
        pincode: string;
        status: string;
        reason: string;
      }> = [];

      for (let r = 2; r <= rowCount; r++) {
        let firstName = getCell(r, "first name");
        let lastName = getCell(r, "last name");
        const legacyName = getCell(r, "name");

        if ((!firstName || !firstName.trim()) && legacyName) {
          const legacy = splitFullName(legacyName);
          firstName = legacy.firstName;
          if ((!lastName || !lastName.trim()) && legacy.lastName) {
            lastName = legacy.lastName;
          }
        }

        firstName = firstName?.trim() || "";
        lastName = lastName?.trim() || "";
        const fullName = buildFullName(firstName, lastName);

        const email = getCell(r, "email");
        const phone = getCell(r, "phone");
        const companyName = getCell(r, "company name");
        const city = getCell(r, "city");
        const state = getCell(r, "state");
        const pincode = getCell(r, "pincode");
        const source = getCell(r, "source");
        const status = getCell(r, "status");

        // Field-level validation - check before duplicate checks to avoid unnecessary DB queries
        const validationErrors = this.validateLeadFields(
          firstName,
          lastName,
          email,
          phone,
          companyName,
          pincode
        );

        if (validationErrors.length > 0) {
          const reason = validationErrors.join("; ");
          errors.push({ row: r, reason });
          skippedRows.push({
            row: r,
            firstName,
            lastName,
            fullName,
            email,
            phone,
            companyName,
            city,
            state,
            pincode,
            status,
            reason,
          });
          continue;
        }

        if (!firstName) {
          const reason = "Missing first name";
          errors.push({ row: r, reason });
          skippedRows.push({
            row: r,
            firstName,
            lastName,
            fullName,
            email,
            phone,
            companyName,
            city,
            state,
            pincode,
            status,
            reason,
          });
          continue;
        }

        if (!email && !phone) {
          const reason = "Missing email and phone (one is required)";
          errors.push({ row: r, reason });
          skippedRows.push({
            row: r,
            firstName,
            lastName,
            fullName,
            email,
            phone,
            companyName,
            city,
            state,
            pincode,
            status,
            reason,
          });
          continue;
        }

        // Duplicate check with specific reason
        if (email) {
          const dupByEmail = await prisma.lead.findFirst({ where: { email } });
          if (dupByEmail) {
            skippedDuplicates++;
            const reason = `Duplicate email: ${email}`;
            skippedRows.push({
              row: r,
              firstName,
              lastName,
              fullName,
              email,
              phone,
              companyName,
              city,
              state,
              pincode,
              status,
              reason,
            });
            continue;
          }
        }
        if (phone) {
          const dupByPhone = await prisma.lead.findFirst({ where: { phone } });
          if (dupByPhone) {
            skippedDuplicates++;
            const reason = `Duplicate phone: ${phone}`;
            skippedRows.push({
              row: r,
              firstName,
              lastName,
              fullName,
              email,
              phone,
              companyName,
              city,
              state,
              pincode,
              status,
              reason,
            });
            continue;
          }
        }

        // Validate enums
        // Force source to IMPORT for all imported leads
        const enumSource: LeadSource = LeadSource.IMPORT;
        let enumStatus: LeadStatus | null = null;
        if (status) {
          const upper = status.toUpperCase();
          const allowedStatuses = [
            "OPEN",
            "WORKING",
            "QUALIFIED",
            "UNQUALIFIED",
            "NURTURING",
            "CONVERTED",
          ];
          if (allowedStatuses.includes(upper)) {
            enumStatus = (LeadStatus as any)[upper] as LeadStatus;
          }
        }
        if (status && !enumStatus) {
          const reason = `Invalid status for row ${r}: status=${status}`;
          errors.push({ row: r, reason });
          skippedDuplicates++;
          continue;
        }

        // Set default status to OPEN if no status is provided
        if (!enumStatus) {
          enumStatus = LeadStatus.OPEN;
        }

        try {
          const createdLead = await prisma.lead.create({
            data: {
              firstName,
              lastName: lastName || null,
              email:
                email ||
                `${Date.now()}_${Math.random().toString(36).slice(2)}@placeholder.local`,
              phone: phone || null,
              companyName: companyName || null,
              city: city || null,
              state: state || null,
              pincode: pincode || null,
              source: enumSource, // always set to IMPORT for imported leads
              status: enumStatus,
            } as any, // TODO: remove `as any` after regenerating Prisma client types
          });

          // If status is Converted, try to convert into Contact (and Account if needed)
          const statusNormalized = (status || "").trim().toLowerCase();
          if (statusNormalized === "converted") {
            // Need email to create/find contact due to unique email constraint
            if (email) {
              // Find or create account if companyName provided
              let accountId: number | null = null;
              if (companyName) {
                const existingAccount = await prisma.account.findUnique({
                  where: { name: companyName },
                });
                const account =
                  existingAccount ||
                  (await prisma.account.create({
                    data: { name: companyName },
                  }));
                accountId = account.id;
              }

              // Find or create contact by email
              let contact = await prisma.contact.findUnique({
                where: { email },
              });
              if (!contact) {
                contact = await prisma.contact.create({
                  data: {
                    name: fullName || firstName,
                    email,
                    phone: phone || null,
                    accountId: accountId || undefined,
                  },
                });
              }

              // Link lead to contact as converted
              await prisma.lead.update({
                where: { id: createdLead.id },
                data: {
                  convertedToContactId: contact.id,
                  status: LeadStatus.CONVERTED,
                },
              });
            }
          }

          insertedCount++;
        } catch (e) {
          const reason = `Insert failed: ${e instanceof Error ? e.message : "unknown error"}`;
          errors.push({ row: r, reason });
          skippedRows.push({
            row: r,
            firstName,
            lastName,
            fullName,
            email,
            phone,
            companyName,
            city,
            state,
            pincode,
            status,
            reason,
          });
        }
      }

      // If there are skipped rows or errors, build an Excel report and return it as base64
      let report:
        | { filename: string; mimeType: string; base64: string }
        | undefined;
      if (skippedRows.length > 0 || errors.length > 0) {
        const reportWb = new ExcelJS.Workbook();
        const skippedSheet = reportWb.addWorksheet("Skipped");
        skippedSheet.columns = [
          { header: "Row", key: "row" },
          { header: "First Name", key: "firstName" },
          { header: "Last Name", key: "lastName" },
          { header: "Full Name", key: "fullName" },
          { header: "Email", key: "email" },
          { header: "Phone", key: "phone" },
          { header: "Company Name", key: "companyName" },
          { header: "City", key: "city" },
          { header: "State", key: "state" },
          { header: "Pincode", key: "pincode" },
          { header: "Status", key: "status" },
          { header: "Reason", key: "reason" },
        ];
        skippedRows.forEach(s => skippedSheet.addRow(s));

        if (errors.length > 0) {
          const errorsSheet = reportWb.addWorksheet("Errors");
          errorsSheet.columns = [
            { header: "Row", key: "row" },
            { header: "Reason", key: "reason" },
          ];
          errors.forEach(e => errorsSheet.addRow(e));
        }

        const buffer = await reportWb.xlsx.writeBuffer();
        const orig = (
          file && (file as any).originalname
            ? String((file as any).originalname)
            : ""
        ).toLowerCase();
        const base = orig
          ? orig.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
          : "upload";
        const ts = new Date();
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
        report = {
          filename: `skipped-leads-report-${stamp}.xlsx`,
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          base64: Buffer.from(buffer).toString("base64"),
        };
      }

      res.json({
        insertedCount,
        skippedDuplicates,
        skippedCount: skippedDuplicates,
        errors,
        report,
      });
    } catch (error) {
      handleError(error, res, "Import leads");
    }
  }
}
