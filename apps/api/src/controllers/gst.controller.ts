import { Request, Response } from 'express';
import { gstService } from '../services/gst.service.js';
import { handleError, handleValidationError } from '../utils/errorHandler.js';

export class GstController {
  async verify(req: Request, res: Response) {
    const gstin = (req.query.gstin as string | undefined)?.trim().toUpperCase();

    if (!gstin || !/^[0-9A-Z]{15}$/.test(gstin)) {
      return handleValidationError(
        res,
        'Valid 15-character GSTIN is required',
        'gstin',
        'GST verify'
      );
    }

    try {
      const details = await gstService.fetchGstDetails(gstin);
      return res.json({ success: true, data: details });
    } catch (error: any) {
      return handleError(error, res, 'GST verify');
    }
  }
}
