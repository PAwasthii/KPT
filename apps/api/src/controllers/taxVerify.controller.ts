import { Request, Response } from 'express';
import { taxVerifyService } from '../services/taxVerify.service.js';
import { handleValidationError, handleServerError } from '../utils/errorHandler.js';

export class TaxVerifyController {
  async verify(req: Request, res: Response) {
    const { taxType, taxNumber, countryIso } = req.body as {
      taxType?: string;
      taxNumber?: string;
      countryIso?: string;
    };

    if (!taxType?.trim()) {
      return handleValidationError(res, 'taxType is required', 'taxType', 'Tax verify');
    }
    if (!taxNumber?.trim()) {
      return handleValidationError(res, 'taxNumber is required', 'taxNumber', 'Tax verify');
    }

    try {
      const result = await taxVerifyService.verify(
        taxType.trim().toUpperCase(),
        taxNumber.trim(),
        countryIso?.trim().toUpperCase(),
      );
      return res.json({ success: true, data: result });
    } catch (error) {
      return handleServerError(error, res, 'Tax verify');
    }
  }
}
