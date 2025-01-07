interface VendorProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  fax: string;
  hourlyRate?: number;
  paymentTerms?: string;
  allowedVariance?: number; // Percentage of allowed rate variation
  status: 'active' | 'inactive';
} 