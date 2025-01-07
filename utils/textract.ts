import { TextractClient } from "@aws-sdk/client-textract";

// Make Textract client optional
let textractClient: TextractClient | null = null;

// Only initialize if credentials are available
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
  textractClient = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: 3,
  });
}

export { textractClient };

// Add pre-processing steps before sending to Textract
const analyzeDocument = async (file: Buffer) => {
  // Configure Textract parameters for better accuracy
  const params = {
    Document: { Bytes: file },
    FeatureTypes: ['FORMS', 'TABLES'], // Enable both forms and tables analysis
    QueriesConfig: {
      Queries: [
        { Text: "What is the invoice number?" },
        { Text: "What is the total amount?" },
        // Add more specific queries based on your needs
      ]
    }
  };
  // ...
}

const queries = [
  {
    Text: "What is the invoice number?",
    Alias: "InvoiceNumber"
  },
  {
    Text: "What is the total amount including tax?",
    Alias: "TotalAmount"
  },
  {
    Text: "What is the invoice date?",
    Alias: "InvoiceDate"
  },
  // Add more specific queries
];

const MIN_CONFIDENCE = 85; // Adjust this threshold as needed

const filterByConfidence = (blocks: any[]) => {
  return blocks.filter(block => 
    block.Confidence >= MIN_CONFIDENCE
  );
}

