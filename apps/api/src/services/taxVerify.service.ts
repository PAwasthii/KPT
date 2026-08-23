import { gstService } from './gst.service.js';

export interface TaxVerifyResult {
  status: 'verified' | 'not_found' | 'invalid' | 'error' | 'manual';
  legalName?: string;
  tradeName?: string;
  address?: string;
  registrationDate?: string;
  businessStatus?: string;
  message?: string;
}

export class TaxVerifyService {
  async verify(taxType: string, taxNumber: string, countryIso?: string): Promise<TaxVerifyResult> {
    switch (taxType) {
      case 'GSTIN':  return this.verifyGSTIN(taxNumber);
      case 'VAT_ID': return this.verifyEUVAT(taxNumber, countryIso ?? '');
      case 'VAT_UK': return this.verifyUKVAT(taxNumber);
      case 'ABN':    return this.verifyABN(taxNumber);
      default:
        return {
          status: 'manual',
          message: 'No automated verification is available for this tax type. Please verify manually.',
        };
    }
  }

  // ─── India GST ───────────────────────────────────────────────────────────

  private async verifyGSTIN(gstin: string): Promise<TaxVerifyResult> {
    try {
      const details = await gstService.fetchGstDetails(gstin);
      return {
        status: 'verified',
        legalName: details.legalName,
        tradeName: details.tradeName,
        address: details.address,
        registrationDate: details.registrationDate,
        businessStatus: details.status,
        message: 'GSTIN verified',
      };
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no data')) {
        return { status: 'not_found', message: 'GSTIN not found' };
      }
      if (msg.toLowerCase().includes('invalid')) {
        return { status: 'invalid', message: msg };
      }
      console.error('[TaxVerify] GSTIN error:', err);
      return { status: 'error', message: 'GST verification failed. Please try again.' };
    }
  }

  // ─── EU VAT (VIES REST API) ───────────────────────────────────────────────

  private async verifyEUVAT(vatNumber: string, countryIso: string): Promise<TaxVerifyResult> {
    // Strip 2-letter country prefix if present (e.g. "DE123456789" → "123456789")
    const clean = vatNumber.toUpperCase().replace(/^[A-Z]{2}/, '');
    const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${countryIso.toUpperCase()}/vat/${clean}`;

    try {
      const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!resp.ok) {
        console.error(`[TaxVerify] VIES HTTP ${resp.status} for ${vatNumber}`);
        return { status: 'error', message: `VIES returned HTTP ${resp.status}. Try again later.` };
      }

      const data = await resp.json() as {
        isValid: boolean;
        name?: string;
        address?: string;
        vatNumber?: string;
        userError?: string;
      };

      if (!data.isValid) {
        return { status: 'not_found', message: data.userError ?? 'VAT number is not valid' };
      }

      return {
        status: 'verified',
        legalName: data.name !== '---' ? data.name : undefined,
        address: data.address !== '---' ? data.address?.replace(/\n/g, ', ') : undefined,
        message: 'VAT number verified via VIES',
      };
    } catch (err: any) {
      console.error('[TaxVerify] VIES error:', err);
      return { status: 'error', message: 'VIES unavailable. Please try again later.' };
    }
  }

  // ─── UK VAT (HMRC) ────────────────────────────────────────────────────────

  private async verifyUKVAT(vatNumber: string): Promise<TaxVerifyResult> {
    const clean = vatNumber.replace(/[^0-9]/g, '');
    const url = `https://api.service.hmrc.gov.uk/organisations/vat/check-vat-number/lookup/${clean}`;

    try {
      const resp = await fetch(url, {
        headers: { Accept: 'application/vnd.hmrc.1.0+json' },
        signal: AbortSignal.timeout(10_000),
      });

      if (resp.status === 404) {
        return { status: 'not_found', message: 'VAT number not found in HMRC records' };
      }
      if (!resp.ok) {
        return { status: 'error', message: `HMRC returned HTTP ${resp.status}. Try again later.` };
      }

      const data = await resp.json() as {
        target?: {
          name?: string;
          vatNumber?: string;
          address?: {
            line1?: string; line2?: string; line3?: string; line4?: string;
            postCode?: string; countryCode?: string;
          };
        };
      };

      const target = data.target;
      const addrParts = [
        target?.address?.line1, target?.address?.line2,
        target?.address?.line3, target?.address?.line4,
        target?.address?.postCode, target?.address?.countryCode,
      ].filter(Boolean);

      return {
        status: 'verified',
        legalName: target?.name,
        address: addrParts.length ? addrParts.join(', ') : undefined,
        message: 'VAT number verified via HMRC',
      };
    } catch (err: any) {
      console.error('[TaxVerify] HMRC error:', err);
      return { status: 'error', message: 'HMRC service unavailable. Please try again later.' };
    }
  }

  // ─── Australian ABN ───────────────────────────────────────────────────────

  private async verifyABN(abn: string): Promise<TaxVerifyResult> {
    const clean = abn.replace(/[^0-9]/g, '');

    if (clean.length !== 11) {
      return { status: 'invalid', message: 'ABN must be exactly 11 digits' };
    }
    if (!isValidABN(clean)) {
      return { status: 'invalid', message: 'Invalid ABN — checksum failed' };
    }

    const guid = process.env.ABN_LOOKUP_GUID;
    if (!guid) {
      return {
        status: 'manual',
        message: 'ABN format is valid. Configure ABN_LOOKUP_GUID for full ASIC verification.',
      };
    }

    try {
      const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${clean}&guid=${guid}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const text = await resp.text();

      // Response may be JSONP: `callback({ ... })` — strip wrapper if present
      const jsonText = text.replace(/^[^(]+\(/, '').replace(/\)\s*;?\s*$/, '');
      const data = JSON.parse(jsonText) as {
        Message?: string;
        EntityName?: string;
        EntityStatus?: { EntityStatusCode?: string };
        AddressState?: string;
        AddressPostcode?: string;
        ABNAgeDescription?: string;
      };

      if (data.Message) {
        return { status: 'not_found', message: data.Message };
      }

      const addrParts = [data.AddressState, data.AddressPostcode].filter(Boolean);
      return {
        status: 'verified',
        legalName: data.EntityName,
        address: addrParts.length ? addrParts.join(' ') : undefined,
        businessStatus: data.EntityStatus?.EntityStatusCode,
        registrationDate: data.ABNAgeDescription,
        message: 'ABN verified via ABN Lookup',
      };
    } catch (err: any) {
      console.error('[TaxVerify] ABN Lookup error:', err);
      return { status: 'error', message: 'ABN Lookup service unavailable. Please try again later.' };
    }
  }
}

function isValidABN(abn: string): boolean {
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = abn.split('').map(Number);
  digits[0] = (digits[0] ?? 0) - 1; // subtract 1 from first digit
  const sum = digits.reduce((acc, d, i) => acc + d * (weights[i] ?? 0), 0);
  return sum % 89 === 0;
}

export const taxVerifyService = new TaxVerifyService();
