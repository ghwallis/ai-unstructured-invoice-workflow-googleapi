import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InvoiceValidator } from './invoiceValidator';
import { vendorDatabase } from './vendorDatabase';

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
const client = new DocumentProcessorServiceClient({
  credentials,
});

const projectId = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GOOGLE_LOCATION;
const processorId = process.env.GOOGLE_PROCESSOR_ID;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function processDocument(buffer: Buffer, mimeType: string) {
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const request = {
    name,
    rawDocument: {
      content: buffer.toString('base64'),
      mimeType: mimeType,
    },
  };

  const [result] = await client.processDocument(request);
  const { document } = result;

  const prompt = `
    You are a precise invoice data extractor. Extract all information exactly as it appears in the invoice.
    Given this invoice text, extract and structure all the information in a clean JSON format:
    
    ${document?.text}

    Return ONLY the JSON, no other text. Structure it exactly as:
    {
      "invoice_details": {
        "number": "",
        "date": "",
        "payment_terms": ""
      },
      "vendor": {
        "name": "",
        "address": "",
        "phone": "",
        "fax": ""
      },
      "client": {
        "name": "",
        "company": "",
        "address": ""
      },
      "line_items": [
        {
          "description": "",
          "hours": "",
          "rate": "",
          "amount": ""
        }
      ],
      "total": ""
    }
  `;

  const result2 = await model.generateContent(prompt);
  const response = await result2.response;
  const text = response.text();
  
  // Extract the JSON part from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const structuredData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  // Add validation step
  const validator = new InvoiceValidator(vendorDatabase);
  const validationResult = await validator.validateInvoice(structuredData);

  return {
    text: document?.text || '',
    entities: document?.entities || [],
    structured: structuredData,
    validation: validationResult
  };
} 