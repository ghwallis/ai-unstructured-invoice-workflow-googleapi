interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  expected: string;
  received: string;
  message: string;
}

interface ValidationWarning {
  field: string;
  message: string;
}

export class InvoiceValidator {
  constructor(private vendorDatabase: VendorProfile[]) {}

  async validateInvoice(extractedData: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Find matching vendor
    const vendor = this.vendorDatabase.find(v => 
      v.name.toLowerCase() === extractedData.vendor.name.toLowerCase()
    );

    if (!vendor) {
      result.errors.push({
        field: 'vendor',
        expected: 'registered vendor',
        received: extractedData.vendor.name,
        message: 'Vendor not found in database'
      });
      result.isValid = false;
      return result;
    }

    // Validate vendor details
    this.validateVendorDetails(vendor, extractedData, result);
    
    // Validate rates and amounts
    this.validateFinancials(vendor, extractedData, result);
    
    // Validate payment terms
    this.validatePaymentTerms(vendor, extractedData, result);

    return result;
  }

  private validateVendorDetails(vendor: VendorProfile, invoice: any, result: ValidationResult) {
    // Address validation
    if (vendor.address !== invoice.vendor.address) {
      result.warnings.push({
        field: 'address',
        message: 'Vendor address does not match registered address'
      });
    }

    // Contact info validation
    if (vendor.phone !== invoice.vendor.phone) {
      result.warnings.push({
        field: 'phone',
        message: 'Phone number does not match registered number'
      });
    }
  }

  private validateFinancials(vendor: VendorProfile, invoice: any, result: ValidationResult) {
    // Rate validation
    const lineItem = invoice.line_items[0];
    if (vendor.hourlyRate) {
      const variance = Math.abs(
        ((parseFloat(lineItem.rate) - vendor.hourlyRate) / vendor.hourlyRate) * 100
      );
      
      if (variance > (vendor.allowedVariance || 0)) {
        result.errors.push({
          field: 'rate',
          expected: vendor.hourlyRate.toString(),
          received: lineItem.rate,
          message: `Rate exceeds allowed variance of ${vendor.allowedVariance}%`
        });
        result.isValid = false;
      }
    }

    // Amount calculation validation
    const calculatedAmount = parseFloat(lineItem.hours) * parseFloat(lineItem.rate);
    if (Math.abs(calculatedAmount - parseFloat(lineItem.amount)) > 0.01) {
      result.errors.push({
        field: 'amount',
        expected: calculatedAmount.toString(),
        received: lineItem.amount,
        message: 'Amount calculation mismatch'
      });
      result.isValid = false;
    }
  }

  private validatePaymentTerms(vendor: VendorProfile, invoice: any, result: ValidationResult) {
    if (vendor.paymentTerms && 
        !invoice.invoice_details.payment_terms.includes(vendor.paymentTerms)) {
      result.warnings.push({
        field: 'paymentTerms',
        message: 'Payment terms do not match vendor agreement'
      });
    }
  }
} 