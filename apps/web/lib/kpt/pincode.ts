export interface PincodeResult {
  city: string;
  district: string;
  state: string;
}

export async function lookupPincode(pin: string): Promise<PincodeResult | null> {
  // Uses free postalpincode.in API
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json() as Array<{ Status: string; PostOffice: Array<{ District: string; Division: string; State: string; Name: string }> }>;
    if (!data[0] || data[0].Status !== 'Success' || !data[0].PostOffice?.length) return null;
    const po = data[0].PostOffice[0]!;
    return { city: po.Division || po.Name, district: po.District, state: po.State };
  } catch {
    return null;
  }
}
