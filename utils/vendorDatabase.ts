interface VendorProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  hourlyRate?: number;
  paymentTerms?: string;
  allowedVariance?: number;
  status: 'active' | 'inactive';
}

export const vendorDatabase: VendorProfile[] = [
  {
    id: '1',
    name: 'Market Financial Consulting',
    address: '450 East 78th Ave, Denver, CO 12345',
    phone: '(123) 456-7890',
    fax: '(123) 456-7891',
    hourlyRate: 375.00,
    paymentTerms: '15 days',
    allowedVariance: 5,
    status: 'active'
  }
]; 