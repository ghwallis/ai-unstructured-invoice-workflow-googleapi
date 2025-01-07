export interface ExtractedData {
  invoiceNumber?: string;
  date?: string;
  amount?: number;
  vendorName?: string;
}

export function parseExtractedText(text: string): ExtractedData {
  const lines = text.split('\n');
  const data: ExtractedData = {};

  // Basic patterns for matching
  const patterns = {
    invoiceNumber: /inv[oice]*.?\s*#?\s*:?\s*([A-Z0-9-]+)/i,
    date: /date:?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i,
    amount: /(?:total|amount|sum):?\s*[\$£€]?\s*(\d+[.,]\d{2})/i,
    vendorName: /(?:from|vendor|company):?\s*([A-Za-z\s]+)/i,
  };

  for (const line of lines) {
    // Match invoice number
    const invoiceMatch = line.match(patterns.invoiceNumber);
    if (invoiceMatch && !data.invoiceNumber) {
      data.invoiceNumber = invoiceMatch[1];
    }

    // Match date
    const dateMatch = line.match(patterns.date);
    if (dateMatch && !data.date) {
      data.date = dateMatch[1];
    }

    // Match amount
    const amountMatch = line.match(patterns.amount);
    if (amountMatch && !data.amount) {
      data.amount = parseFloat(amountMatch[1].replace(',', ''));
    }

    // Match vendor name
    const vendorMatch = line.match(patterns.vendorName);
    if (vendorMatch && !data.vendorName) {
      data.vendorName = vendorMatch[1].trim();
    }
  }

  return data;
} 