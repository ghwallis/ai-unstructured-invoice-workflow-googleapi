const validateFields = (extractedData: any) => {
  return {
    invoiceNumber: validateInvoiceNumber(extractedData.invoiceNumber),
    amount: validateAmount(extractedData.amount),
    date: validateDate(extractedData.date),
    // Add more field validations
  };
}

const validateInvoiceNumber = (invoiceNum: string) => {
  // Add specific validation rules for invoice numbers
  const cleaned = invoiceNum.trim().replace(/[^\w-]/g, '');
  return cleaned.length > 0 ? cleaned : null;
} 