'use server'

import { processDocument } from '@/utils/documentAI';

export async function processInvoice(formData: FormData) {
  const file = formData.get('file') as File;
  
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processDocument(buffer, file.type);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process document'
    };
  }
}

