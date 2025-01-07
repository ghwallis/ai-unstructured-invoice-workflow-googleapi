const cleanExtractedText = (text: string) => {
  return text
    .trim()
    .replace(/\s+/g, ' ')    // Normalize spaces
    .replace(/[^\w\s.-]/g, '') // Remove special characters except dots and dashes
}

const validateAmount = (amount: string) => {
  // Remove currency symbols and validate format
  const cleanAmount = amount.replace(/[^0-9.-]/g, '');
  return !isNaN(parseFloat(cleanAmount)) ? parseFloat(cleanAmount) : null;
}

const validateDate = (date: string) => {
  // Add date validation and standardization
  const parsed = Date.parse(date);
  return !isNaN(parsed) ? new Date(parsed).toISOString() : null;
} 