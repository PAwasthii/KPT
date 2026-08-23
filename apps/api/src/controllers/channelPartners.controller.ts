import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import { AuditCategory, PartnerType, PartnerTier, PartnerStatus } from '@prisma/client';
import { handleError, handleValidationError, handleNotFoundError } from '../utils/errorHandler.js';
import { recordAuditLog } from '../utils/audit.utils.js';

export class ChannelPartnerController {
  /**
   * GET /api/kpt/channel-partners
   * Paginated list with optional filters: page, limit, type, tier, status, search
   */
  async getAll(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const requestedLimit = parseInt(req.query.limit as string);
      const limit = requestedLimit >= 1 && requestedLimit <= 100 ? requestedLimit : 20;
      const skip = (page - 1) * limit;

      const { type, tier, status, search } = req.query;

      const where: any = {};

      if (type) where.type = type;
      if (tier) where.tier = tier;
      if (status) where.status = status;

      if (search) {
        const q = search as string;
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { crn: { contains: q, mode: 'insensitive' } },
          { contactName: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [total, partners] = await Promise.all([
        prisma.channelPartner.count({ where }),
        prisma.channelPartner.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return res.json({
        success: true,
        data: partners,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      handleError(error, res, 'Get all channel partners');
    }
  }

  /**
   * GET /api/kpt/channel-partners/:id
   * Single partner with incentives and stockEntries
   */
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) {
        return handleValidationError(res, 'Partner ID is required', 'id', 'Get channel partner');
      }

      const partner = await prisma.channelPartner.findUnique({
        where: { id },
        include: {
          incentives: {
            orderBy: { createdAt: 'desc' },
          },
          stockEntries: {
            orderBy: { productName: 'asc' },
          },
        },
      });

      if (!partner) {
        return handleNotFoundError(res, 'Channel partner', 'Get channel partner');
      }

      return res.json({ success: true, data: partner });
    } catch (error) {
      handleError(error, res, 'Get channel partner by ID');
    }
  }

  /**
   * POST /api/kpt/channel-partners
   * Create a new channel partner
   * Required: code, name, type, contactName, contactPhone, city, state
   */
  async create(req: Request, res: Response) {
    try {
      const {
        code,
        name,
        type,
        tier,
        status,
        contactName,
        contactEmail,
        countryCode,
        contactPhone,
        pincode,
        city,
        state,
        country,
        geoLat,
        geoLng,
        region,
        gstin,
        taxType,
        taxNumber,
        creditLimit,
        outstandingPayment,
        currentMonthSales,
        ytdSales,
        targetAmount,
        notes,
      } = req.body;

      if (!code || !name || !type || !contactName || !contactPhone) {
        return handleValidationError(
          res,
          'Missing required fields: code, name, type, contactName, contactPhone',
          undefined,
          'Create channel partner'
        );
      }

      const phoneDigits = String(contactPhone).replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        return handleValidationError(res, 'Phone number must have 7–15 digits', 'contactPhone', 'Create channel partner');
      }

      if (contactEmail) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contactEmail).trim())) {
          return handleValidationError(res, 'Invalid email address format', 'contactEmail', 'Create channel partner');
        }
      }

      const partner = await prisma.channelPartner.create({
        data: {
          code: code.trim(),
          name: name.trim(),
          type,
          tier: tier ?? 'BRONZE',
          status: status ?? 'ACTIVE',
          contactName: contactName.trim(),
          contactEmail: contactEmail ?? null,
          countryCode: countryCode ?? '+91',
          contactPhone: contactPhone.trim(),
          pincode: pincode ?? null,
          city: city ?? null,
          state: state ?? null,
          country: country ?? null,
          geoLat: geoLat != null ? Number(geoLat) : null,
          geoLng: geoLng != null ? Number(geoLng) : null,
          region: region ?? null,
          taxType: taxType ?? null,
          taxNumber: taxNumber ?? null,
          gstin: taxType === 'GSTIN' ? (taxNumber ?? null) : (gstin ?? null),
          creditLimit: creditLimit ?? 0,
          outstandingPayment: outstandingPayment ?? 0,
          currentMonthSales: currentMonthSales ?? 0,
          ytdSales: ytdSales ?? 0,
          targetAmount: targetAmount ?? 0,
          notes: notes ?? null,
        },
      });

      await recordAuditLog({
        action: 'PARTNER_CREATED',
        changedBy: req.user!.id,
        entityType: 'ChannelPartner',
        entityId: partner.id,
        newValues: { code: partner.code, name: partner.name, type: partner.type, tier: partner.tier, city: partner.city, state: partner.state },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: partner });
    } catch (error) {
      console.error('[ChannelPartner.create] Full error:', error);
      handleError(error, res, 'Create channel partner');
    }
  }

  /**
   * PUT /api/kpt/channel-partners/:id
   * Update a channel partner
   */
  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) {
        return handleValidationError(res, 'Partner ID is required', 'id', 'Update channel partner');
      }

      const existing = await prisma.channelPartner.findUnique({ where: { id } });
      if (!existing) {
        return handleNotFoundError(res, 'Channel partner', 'Update channel partner');
      }

      const {
        code,
        name,
        type,
        tier,
        status,
        contactName,
        contactEmail,
        countryCode,
        contactPhone,
        pincode,
        city,
        state,
        country,
        geoLat,
        geoLng,
        region,
        gstin,
        taxType,
        taxNumber,
        creditLimit,
        outstandingPayment,
        currentMonthSales,
        ytdSales,
        targetAmount,
        notes,
      } = req.body;

      if (contactPhone !== undefined) {
        const phoneDigits = String(contactPhone).replace(/\D/g, '');
        if (phoneDigits.length < 7 || phoneDigits.length > 15) {
          return handleValidationError(res, 'Phone number must have 7–15 digits', 'contactPhone', 'Update channel partner');
        }
      }

      if (contactEmail !== undefined && contactEmail !== null && contactEmail !== '') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contactEmail).trim())) {
          return handleValidationError(res, 'Invalid email address format', 'contactEmail', 'Update channel partner');
        }
      }

      const updated = await prisma.channelPartner.update({
        where: { id },
        data: {
          ...(code !== undefined && { code: code.trim() }),
          ...(name !== undefined && { name: name.trim() }),
          ...(type !== undefined && { type }),
          ...(tier !== undefined && { tier }),
          ...(status !== undefined && { status }),
          ...(contactName !== undefined && { contactName: contactName.trim() }),
          ...(contactEmail !== undefined && { contactEmail }),
          ...(countryCode !== undefined && { countryCode }),
          ...(contactPhone !== undefined && { contactPhone: contactPhone.trim() }),
          ...(pincode !== undefined && { pincode }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(country !== undefined && { country }),
          ...(geoLat !== undefined && { geoLat: geoLat != null ? Number(geoLat) : null }),
          ...(geoLng !== undefined && { geoLng: geoLng != null ? Number(geoLng) : null }),
          ...(region !== undefined && { region }),
          ...(taxType !== undefined && { taxType }),
          ...(taxNumber !== undefined && { taxNumber }),
          ...((gstin !== undefined || taxType !== undefined) && {
            gstin: taxType === 'GSTIN' ? (taxNumber ?? null) : (gstin ?? null),
          }),
          ...(creditLimit !== undefined && { creditLimit }),
          ...(outstandingPayment !== undefined && { outstandingPayment }),
          ...(currentMonthSales !== undefined && { currentMonthSales }),
          ...(ytdSales !== undefined && { ytdSales }),
          ...(targetAmount !== undefined && { targetAmount }),
          ...(notes !== undefined && { notes }),
        },
      });

      await recordAuditLog({
        action: 'PARTNER_UPDATED',
        changedBy: req.user!.id,
        entityType: 'ChannelPartner',
        entityId: id,
        oldValues: { name: existing.name, tier: existing.tier, status: existing.status, city: existing.city },
        newValues: { name: updated.name, tier: updated.tier, status: updated.status, city: updated.city },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update channel partner');
    }
  }

  /**
   * DELETE /api/kpt/channel-partners/:id
   * Delete a channel partner (cascades via Prisma)
   */
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) {
        return handleValidationError(res, 'Partner ID is required', 'id', 'Delete channel partner');
      }

      const existing = await prisma.channelPartner.findUnique({ where: { id } });
      if (!existing) {
        return handleNotFoundError(res, 'Channel partner', 'Delete channel partner');
      }

      await prisma.channelPartner.delete({ where: { id } });

      await recordAuditLog({
        action: 'PARTNER_DELETED',
        changedBy: req.user!.id,
        entityType: 'ChannelPartner',
        entityId: id,
        oldValues: { name: existing.name, code: existing.code, type: existing.type, tier: existing.tier },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, message: 'Channel partner deleted successfully' });
    } catch (error) {
      handleError(error, res, 'Delete channel partner');
    }
  }

  /**
   * POST /api/kpt/channel-partners/bulk-import
   * Bulk create/update partners from parsed spreadsheet rows
   */
  async bulkImport(req: Request, res: Response) {
    try {
      const { partners } = req.body;

      if (!Array.isArray(partners) || partners.length === 0) {
        return handleValidationError(res, 'partners must be a non-empty array', 'partners', 'Bulk import partners');
      }

      if (partners.length > 500) {
        return handleValidationError(res, 'Maximum 500 partners per import', 'partners', 'Bulk import partners');
      }

      let created = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const raw of partners) {
        const code = String(raw.code ?? '').trim();
        const name = String(raw.name ?? '').trim();

        if (!name) {
          errors.push(`Skipped row — missing Name`);
          continue;
        }

        const type = ['DISTRIBUTOR', 'DEALER', 'RETAILER'].includes(String(raw.type ?? '').toUpperCase())
          ? String(raw.type).toUpperCase()
          : 'DEALER';
        const tier = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].includes(String(raw.tier ?? '').toUpperCase())
          ? String(raw.tier).toUpperCase()
          : 'BRONZE';

        const data = {
          name,
          type: type as PartnerType,
          tier: tier as PartnerTier,
          status: 'ACTIVE' as PartnerStatus,
          contactName: String(raw.contactName ?? '').trim() || name,
          contactPhone: String(raw.contactPhone ?? '').trim(),
          contactEmail: raw.contactEmail ? String(raw.contactEmail).trim() : null,
          city: String(raw.city ?? '').trim(),
          state: String(raw.state ?? '').trim(),
          country: raw.country ? String(raw.country).trim() : 'India',
          region: raw.region ? String(raw.region).trim() : null,
          gstin: raw.gstin ? String(raw.gstin).toUpperCase().trim() : null,
          targetAmount: raw.targetAmount !== undefined ? Number(raw.targetAmount) : 0,
          creditLimit: 0,
          outstandingPayment: 0,
          currentMonthSales: 0,
          ytdSales: 0,
        };

        if (code) {
          const existing = await prisma.channelPartner.findFirst({ where: { code } });
          if (existing) {
            await prisma.channelPartner.update({ where: { id: existing.id }, data: { ...data, code } });
            updated++;
            continue;
          }
        }

        // Check by name if no code or code not found
        const existingByName = await prisma.channelPartner.findFirst({ where: { name } });
        if (existingByName) {
          await prisma.channelPartner.update({ where: { id: existingByName.id }, data });
          updated++;
        } else {
          await prisma.channelPartner.create({
            data: { ...data, code: code || `CP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` },
          });
          created++;
        }
      }

      await recordAuditLog({
        action: 'PARTNER_BULK_IMPORT',
        changedBy: req.user!.id,
        entityType: 'ChannelPartner',
        entityId: 0,
        newValues: { created, updated, errors: errors.length },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, data: { created, updated, errors } });
    } catch (error) {
      handleError(error, res, 'Bulk import partners');
    }
  }

  /**
   * GET /api/kpt/channel-partners/incentives
   * Get all incentive records across all partners (flat list with partner join)
   */
  async getAllIncentives(req: Request, res: Response) {
    try {
      const { period, partnerId, status, city } = req.query;
      const incentives = await prisma.partnerIncentive.findMany({
        where: {
          ...(period && { period: String(period) }),
          ...(partnerId && { partnerId: Number(partnerId) }),
          ...(status && { status: String(status) as any }),
          ...(city && { partner: { city: String(city) } }),
        },
        include: { partner: { select: { id: true, name: true, city: true, tier: true } } },
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      });
      return res.json({ success: true, data: incentives });
    } catch (error) {
      handleError(error, res, 'Get all incentives');
    }
  }

  /**
   * GET /api/kpt/channel-partners/:id/incentives
   * Get all incentives for a specific partner
   */
  async getIncentives(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) {
        return handleValidationError(res, 'Partner ID is required', 'id', 'Get partner incentives');
      }

      const partner = await prisma.channelPartner.findUnique({ where: { id } });
      if (!partner) {
        return handleNotFoundError(res, 'Channel partner', 'Get partner incentives');
      }

      const incentives = await prisma.partnerIncentive.findMany({
        where: { partnerId: id },
        orderBy: { period: 'desc' },
      });

      return res.json({ success: true, data: incentives });
    } catch (error) {
      handleError(error, res, 'Get partner incentives');
    }
  }

  /**
   * POST /api/kpt/channel-partners/:id/incentives
   * Create an incentive record for a partner
   */
  async createIncentive(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id ?? '');
      if (!id || isNaN(id)) {
        return handleValidationError(res, 'Partner ID is required', 'id', 'Create partner incentive');
      }

      const partner = await prisma.channelPartner.findUnique({ where: { id } });
      if (!partner) {
        return handleNotFoundError(res, 'Channel partner', 'Create partner incentive');
      }

      const {
        period,
        salesAmount,
        incentivePercent,
        incentiveAmount,
        adjustment,
        status,
        remarks,
      } = req.body;

      if (!period || salesAmount === undefined || incentivePercent === undefined) {
        return handleValidationError(
          res,
          'Missing required fields: period, salesAmount, incentivePercent',
          undefined,
          'Create partner incentive'
        );
      }

      const computedAmount = incentiveAmount ?? (salesAmount * incentivePercent) / 100;
      const computedAdj = Number(adjustment ?? 0);
      const incentive = await prisma.partnerIncentive.create({
        data: {
          partnerId: id,
          period,
          salesAmount,
          incentivePercent,
          incentiveAmount: computedAmount,
          adjustment: computedAdj,
          netReward: computedAmount + computedAdj,
          status: status ?? 'PENDING',
          remarks: remarks ?? null,
        },
      });

      await recordAuditLog({
        action: 'INCENTIVE_CREATED',
        changedBy: req.user!.id,
        entityType: 'PartnerIncentive',
        entityId: incentive.id,
        newValues: { partnerId: id, partnerName: partner.name, period, salesAmount, incentivePercent, incentiveAmount: incentive.incentiveAmount, status: incentive.status },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: incentive });
    } catch (error) {
      handleError(error, res, 'Create partner incentive');
    }
  }

  /**
   * PATCH /api/kpt/channel-partners/incentives/:incentiveId
   * Update incentive status (approve, reject, mark paid, etc.)
   */
  async updateIncentive(req: Request, res: Response) {
    try {
      const incentiveId = parseInt(req.params.incentiveId ?? '');
      if (!incentiveId || isNaN(incentiveId)) {
        return handleValidationError(res, 'Incentive ID is required', 'incentiveId', 'Update incentive');
      }

      const existing = await prisma.partnerIncentive.findUnique({ where: { id: incentiveId } });
      if (!existing) {
        return handleNotFoundError(res, 'Partner incentive', 'Update incentive');
      }

      const {
        status,
        remarks,
        salesAmount,
        incentivePercent,
        incentiveAmount,
        adjustment,
        approvedAt,
        paidAt,
      } = req.body;

      const newAdj = adjustment !== undefined ? Number(adjustment) : existing.adjustment;
      const newAmt = incentiveAmount !== undefined
        ? Number(incentiveAmount)
        : salesAmount !== undefined
          ? Number(salesAmount) * Number(incentivePercent ?? existing.incentivePercent) / 100
          : existing.incentiveAmount;
      const shouldRecomputeNet = adjustment !== undefined || salesAmount !== undefined || incentiveAmount !== undefined;

      const updated = await prisma.partnerIncentive.update({
        where: { id: incentiveId },
        data: {
          ...(status !== undefined && { status }),
          ...(remarks !== undefined && { remarks }),
          ...(salesAmount !== undefined && { salesAmount: Number(salesAmount) }),
          ...(incentivePercent !== undefined && { incentivePercent: Number(incentivePercent) }),
          ...(incentiveAmount !== undefined && { incentiveAmount: Number(incentiveAmount) }),
          ...(adjustment !== undefined && { adjustment: newAdj }),
          ...(shouldRecomputeNet && { netReward: newAmt + newAdj }),
          ...(approvedAt !== undefined && { approvedAt: new Date(approvedAt) }),
          ...(paidAt !== undefined && { paidAt: new Date(paidAt) }),
          // Auto-set timestamps based on status transitions
          ...(status === 'APPROVED' && !approvedAt && { approvedAt: new Date() }),
          ...(status === 'PAID' && !paidAt && { paidAt: new Date() }),
        },
      });

      await recordAuditLog({
        action: 'INCENTIVE_UPDATED',
        changedBy: req.user!.id,
        entityType: 'PartnerIncentive',
        entityId: incentiveId,
        oldValues: { status: existing.status, salesAmount: existing.salesAmount, remarks: existing.remarks },
        newValues: { status: updated.status, salesAmount: updated.salesAmount, remarks: updated.remarks },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      handleError(error, res, 'Update incentive');
    }
  }

  /**
   * GET /api/kpt/channel-partners/eligible-applications
   * Returns KptPartner records with stage >= 4 and status !== 'activated'
   * that do NOT already have a linked ChannelPartner (i.e., eligible to activate).
   */
  async getEligibleApplications(req: Request, res: Response) {
    try {
      const applications = await prisma.kptPartner.findMany({
        where: {
          currentStage: { gte: 4 },
          status: { not: 'activated' },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filter out any whose CRN is already linked to a ChannelPartner
      const crns = applications.map((a) => a.crn);
      const alreadyLinked = await prisma.channelPartner.findMany({
        where: { crn: { in: crns } },
        select: { crn: true },
      });
      const linkedCrns = new Set(alreadyLinked.map((c) => c.crn).filter(Boolean));

      const eligible = applications.filter((a) => !linkedCrns.has(a.crn));

      return res.json({
        success: true,
        data: eligible.map((a) => ({
          crn: a.crn,
          firmName: a.firmName,
          ownerName: a.ownerName,
          mobile: a.mobile,
          email: a.email,
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          currentStage: a.currentStage,
          status: a.status,
        })),
      });
    } catch (error) {
      handleError(error, res, 'Get eligible applications');
    }
  }

  /**
   * GET /api/kpt/channel-partners/activate-info/:crn
   * Fetch KptPartner application data for pre-filling the activation form.
   * Only returns data if currentStage >= 4 and not already activated.
   */
  async getApplicationForActivation(req: Request, res: Response) {
    try {
      const { crn } = req.params;
      if (!crn) {
        return handleValidationError(res, 'CRN is required', 'crn', 'Get application for activation');
      }

      const application = await prisma.kptPartner.findUnique({
        where: { crn },
        include: { fieldReport: true },
      });

      if (!application) {
        return handleNotFoundError(res, 'Partner application', 'Get application for activation');
      }

      if (application.currentStage < 4) {
        return res.status(422).json({
          success: false,
          error: `Application must be at stage 4 or higher to activate (currently stage ${application.currentStage})`,
        });
      }

      const alreadyActivated = await prisma.channelPartner.findFirst({ where: { crn } });
      if (alreadyActivated) {
        return res.status(409).json({
          success: false,
          error: 'A channel partner is already linked to this CRN',
          existingPartnerId: alreadyActivated.id,
        });
      }

      return res.json({
        success: true,
        data: {
          crn: application.crn,
          firmName: application.firmName,
          ownerName: application.ownerName,
          mobile: application.mobile,
          email: application.email,
          city: application.city,
          state: application.state,
          pincode: application.pincode,
          currentStage: application.currentStage,
          status: application.status,
          geoLat: application.fieldReport?.geoLat ?? null,
          geoLng: application.fieldReport?.geoLng ?? null,
        },
      });
    } catch (error) {
      handleError(error, res, 'Get application for activation');
    }
  }

  /**
   * POST /api/kpt/channel-partners/activate/:crn
   * Create a ChannelPartner from an approved KptPartner application.
   * Required body: type, region, targetAmount, code (optional — auto-generated if omitted)
   */
  async activateFromApplication(req: Request, res: Response) {
    try {
      const { crn } = req.params;
      if (!crn) {
        return handleValidationError(res, 'CRN is required', 'crn', 'Activate from application');
      }

      const application = await prisma.kptPartner.findUnique({
        where: { crn },
        include: { fieldReport: true },
      });

      if (!application) {
        return handleNotFoundError(res, 'Partner application', 'Activate from application');
      }

      if (application.currentStage < 4) {
        return res.status(422).json({
          success: false,
          error: `Application must be at stage 4 or higher to activate (currently stage ${application.currentStage})`,
        });
      }

      const existing = await prisma.channelPartner.findFirst({ where: { crn } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A channel partner is already linked to this CRN',
          existingPartnerId: existing.id,
        });
      }

      const { type, tier, region, targetAmount } = req.body;

      if (!type) {
        return handleValidationError(res, 'Partner type is required', 'type', 'Activate from application');
      }

      const validTypes = ['DISTRIBUTOR', 'DEALER', 'RETAILER'];
      if (!validTypes.includes(String(type).toUpperCase())) {
        return handleValidationError(res, `type must be one of: ${validTypes.join(', ')}`, 'type', 'Activate from application');
      }

      const codeBase = crn.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
      const generatedCode = req.body.code?.trim() || `CP-${codeBase}-${Date.now().toString(36).toUpperCase().slice(-4)}`;

      const partner = await prisma.channelPartner.create({
        data: {
          code: generatedCode,
          name: application.firmName,
          type: String(type).toUpperCase() as PartnerType,
          tier: (tier ? String(tier).toUpperCase() : 'BRONZE') as PartnerTier,
          status: 'ACTIVE' as PartnerStatus,
          contactName: application.ownerName,
          contactEmail: application.email,
          countryCode: application.countryCode ?? '+91',
          contactPhone: application.mobile,
          city: application.city ?? null,
          state: application.state ?? null,
          country: 'India',
          pincode: application.pincode ?? null,
          geoLat: application.fieldReport?.geoLat ?? null,
          geoLng: application.fieldReport?.geoLng ?? null,
          region: region ?? null,
          targetAmount: targetAmount != null ? Number(targetAmount) : 0,
          creditLimit: 0,
          outstandingPayment: 0,
          currentMonthSales: 0,
          ytdSales: 0,
          crn,
          activatedAt: new Date(),
          activatedById: req.user!.id,
        },
      });

      await prisma.kptPartner.update({
        where: { crn },
        data: { status: 'activated' },
      });

      await recordAuditLog({
        action: 'PARTNER_ACTIVATED',
        changedBy: req.user!.id,
        entityType: 'ChannelPartner',
        entityId: partner.id,
        newValues: { crn, code: partner.code, name: partner.name, type: partner.type, tier: partner.tier, region: partner.region },
        category: AuditCategory.SALES_MANAGEMENT,
      });

      return res.status(201).json({ success: true, data: partner });
    } catch (error) {
      handleError(error, res, 'Activate from application');
    }
  }
}
