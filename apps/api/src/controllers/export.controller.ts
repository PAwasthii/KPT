import { Request, Response } from "express";
import { prisma } from "@repo/db";
import { handleError, handleValidationError } from "../utils/errorHandler.js";
import { ExcelService, ExportEntity } from "../services/excel.service.js";
import ExcelJS from "exceljs";
import { stringify } from "csv-stringify/sync";
import { buildFullName } from "../utils/nameHelpers.js";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const MAX_PAGE_SPAN = 50;

export class ExportController {
  private excel: ExcelService;

  constructor() {
    this.excel = new ExcelService();
  }

  private getHeaders(entity: ExportEntity): string[] {
    if (entity === "leads") {
      return [
        "ID",
        "First Name",
        "Last Name",
        "Full Name",
        "Email",
        "Phone",
        "Company Name",
        "City",
        "State",
        "Pincode",
        "Source",
        "Status",
        "Created At",
      ];
    } else if (entity === "contacts") {
      return [
        "ID",
        "Name",
        "Email",
        "Phone",
        "Position",
        "Account",
        "Created At",
      ];
    } else {
      return ["ID", "Name", "Industry", "Website", "Created At"];
    }
  }

  private async fetchEntityData(
    entity: ExportEntity,
    startPage: number,
    endPage: number,
    limit: number
  ): Promise<any[]> {
    const allItems: any[] = [];

    for (let page = startPage; page <= endPage; page++) {
      const skip = (page - 1) * limit;
      if (entity === "leads") {
        const items = await prisma.lead.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        items.forEach((item) =>
          allItems.push({
            id: item.id,
            firstName: item.firstName,
            lastName: item.lastName ?? "",
            fullName: buildFullName(item.firstName, item.lastName),
            email: item.email,
            phone: item.phone || "",
            companyName: item.companyName || "",
            city: item.city || "",
            state: item.state || "",
            pincode: item.pincode || "",
            source: item.source || "",
            status: item.status || "",
            createdAt: item.createdAt.toISOString(),
          })
        );
      } else if (entity === "contacts") {
        const items = await prisma.contact.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { account: true },
        });
        items.forEach((item) =>
          allItems.push({
            id: item.id,
            name: item.name,
            email: item.email,
            phone: item.phone || "",
            position: item.position || "",
            accountName: item.account?.name || "",
            createdAt: item.createdAt.toISOString(),
          })
        );
      } else {
        const items = await prisma.account.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        });
        items.forEach((item) =>
          allItems.push({
            id: item.id,
            name: item.name,
            industry: item.industry || "",
            website: item.website || "",
            createdAt: item.createdAt.toISOString(),
          })
        );
      }
    }

    return allItems;
  }

  private mapDataToHeaders(entity: ExportEntity, data: any[]): any[] {
    const headers = this.getHeaders(entity);
    return data.map((item) => {
      if (entity === "leads") {
        return [
          item.id,
          item.firstName,
          item.lastName,
          item.fullName,
          item.email,
          item.phone,
          item.companyName,
          item.city,
          item.state,
          item.pincode,
          item.source,
          item.status,
          item.createdAt,
        ];
      } else if (entity === "contacts") {
        return [
          item.id,
          item.name,
          item.email,
          item.phone,
          item.position,
          item.accountName,
          item.createdAt,
        ];
      } else {
        return [item.id, item.name, item.industry, item.website, item.createdAt];
      }
    });
  }

  async exportEntityXlsx(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) || "xlsx";
      if (!["xlsx", "csv"].includes(format)) {
        return handleValidationError(
          res,
          "Invalid format. Use xlsx or csv",
          "format",
          "Export entity"
        );
      }

      if (format === "csv") {
        return this.exportEntityCsv(req, res);
      }

      const entity = (req.params.entity as ExportEntity) || "leads";
      if (!["leads", "contacts", "accounts"].includes(entity)) {
        return handleValidationError(
          res,
          "Invalid entity. Use leads|contacts|accounts",
          "entity",
          "Export entity xlsx"
        );
      }

      const startPage = Math.max(
        1,
        parseInt(String(req.query.startPage || "1")) || 1
      );
      const endPage = Math.max(
        startPage,
        parseInt(String(req.query.endPage || String(startPage))) || startPage
      );
      const requestedLimit =
        parseInt(String(req.query.limit || String(DEFAULT_LIMIT))) ||
        DEFAULT_LIMIT;
      const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

      if (endPage - startPage > MAX_PAGE_SPAN) {
        return handleValidationError(
          res,
          `Page span too large. Max span is ${MAX_PAGE_SPAN} pages.`,
          "endPage",
          "Export entity xlsx"
        );
      }

      const workbook = this.excel.createWorkbook();
      const sheet = workbook.addWorksheet(entity);

      // Set headers per entity
      if (entity === "leads") {
        sheet.columns = [
          { header: "ID", key: "id" },
          { header: "Name", key: "name" },
          { header: "Email", key: "email" },
          { header: "Phone", key: "phone" },
          { header: "Company Name", key: "companyName" },
          { header: "City", key: "city" },
          { header: "State", key: "state" },
          { header: "Pincode", key: "pincode" },
          { header: "Source", key: "source" },
          { header: "Status", key: "status" },
          { header: "Created At", key: "createdAt" },
        ];
      } else if (entity === "contacts") {
        sheet.columns = [
          { header: "ID", key: "id" },
          { header: "Name", key: "name" },
          { header: "Email", key: "email" },
          { header: "Phone", key: "phone" },
          { header: "Position", key: "position" },
          { header: "Account", key: "accountName" },
          { header: "Created At", key: "createdAt" },
        ];
      } else {
        sheet.columns = [
          { header: "ID", key: "id" },
          { header: "Name", key: "name" },
          { header: "Industry", key: "industry" },
          { header: "Website", key: "website" },
          { header: "Created At", key: "createdAt" },
        ];
      }

      const data = await this.fetchEntityData(entity, startPage, endPage, limit);
      data.forEach((item) => {
        sheet.addRow(item);
      });

      this.excel.autosizeColumns(sheet);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${entity}-${Date.now()}.xlsx"`
      );
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      handleError(error, res, "Export entity xlsx");
    }
  }

  async exportEntityCsv(req: Request, res: Response) {
    try {
      const entity = (req.params.entity as ExportEntity) || "leads";
      if (!["leads", "contacts", "accounts"].includes(entity)) {
        return handleValidationError(
          res,
          "Invalid entity. Use leads|contacts|accounts",
          "entity",
          "Export entity csv"
        );
      }

      const startPage = Math.max(
        1,
        parseInt(String(req.query.startPage || "1")) || 1
      );
      const endPage = Math.max(
        startPage,
        parseInt(String(req.query.endPage || String(startPage))) || startPage
      );
      const requestedLimit =
        parseInt(String(req.query.limit || String(DEFAULT_LIMIT))) ||
        DEFAULT_LIMIT;
      const limit = Math.min(Math.max(1, requestedLimit), MAX_LIMIT);

      if (endPage - startPage > MAX_PAGE_SPAN) {
        return handleValidationError(
          res,
          `Page span too large. Max span is ${MAX_PAGE_SPAN} pages.`,
          "endPage",
          "Export entity csv"
        );
      }

      const headers = this.getHeaders(entity);
      const data = await this.fetchEntityData(entity, startPage, endPage, limit);
      const rows = this.mapDataToHeaders(entity, data);

      // Generate CSV with UTF-8 BOM for Excel compatibility
      const csvContent = stringify([headers, ...rows], {
        header: false,
        quoted: true,
        quoted_empty: true,
        bom: true,
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${entity}-${Date.now()}.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      handleError(error, res, "Export entity csv");
    }
  }

  async emailSelectedLeadsXlsx(req: Request, res: Response) {
    try {
      const { to, leadIds } = req.body as { to?: string; leadIds?: number[] };
      if (!to) {
        return handleValidationError(
          res,
          "Recipient email is required",
          "to",
          "Email selected leads"
        );
      }
      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return handleValidationError(
          res,
          "leadIds must be a non-empty array of numbers",
          "leadIds",
          "Email selected leads"
        );
      }

      // Early configuration check for Plunk
      if (!process.env.PLUNK_API_KEY || !process.env.PLUNK_FROM_EMAIL) {
        return handleValidationError(
          res,
          "Email service not configured. Please set PLUNK_API_KEY and PLUNK_FROM_EMAIL in the API environment.",
          "email",
          "Email selected leads"
        );
      }

      const items = await prisma.lead.findMany({
        where: { id: { in: leadIds } },
      });

      if (items.length === 0) {
        return handleValidationError(
          res,
          "No leads found for provided IDs",
          "leadIds",
          "Email selected leads"
        );
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Leads");

      // Only default fields + leadId + createdAt timestamp
      sheet.columns = [
        { header: "Lead ID", key: "leadId" },
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
        { header: "Phone", key: "phone" },
        { header: "Source", key: "source" },
        { header: "Status", key: "status" },
        { header: "Created At", key: "createdAt" },
      ];

      items.forEach((item: any) => {
        sheet.addRow({
          leadId: item.id,
          name: item.name || "",
          email: item.email || "",
          phone: item.phone || "",
          source: item.source || "",
          status: item.status || "",
          createdAt:
            item.createdAt instanceof Date
              ? item.createdAt.toISOString()
              : String(item.createdAt || ""),
        });
      });

      // Autosize
      const colCount = sheet.columns.length;
      for (let i = 1; i <= colCount; i++) {
        const col = sheet.getColumn(i);
        let max = 10;
        col.eachCell({ includeEmpty: true }, cell => {
          const len = String(cell.value || "").length;
          if (len > max) max = len;
        });
        col.width = Math.min(Math.max(max + 2, 10), 60);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      // Defer to email service to send with attachment
      const { emailService } = await import("../services/email.service.js");
      const ok = await emailService.sendEmail({
        to,
        subject: `Leads Export (${items.length})`,
        body: "Please find attached the selected leads in Excel format.",
        name: "",
        replyTo: undefined,
        // @ts-ignore - extended in runtime below when we add attachments support
        attachments: {
          "leads.xlsx": {
            content: base64,
            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        },
      } as any);

      if (!ok) {
        return handleValidationError(
          res,
          "Failed to send email (Plunk API rejected request). Verify PLUNK credentials and sender settings.",
          "email",
          "Email selected leads"
        );
      }

      return res.json({ success: true });
    } catch (error) {
      handleError(error, res, "Email selected leads");
    }
  }
}
