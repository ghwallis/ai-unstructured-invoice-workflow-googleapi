import { createWorker } from 'tesseract.js';
import { textractClient } from './textract';
import { AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

export enum ProcessorType {
  TESSERACT = 'tesseract',
  TEXTRACT = 'textract'
}

export class DocumentProcessor {
  private processorType: ProcessorType;

  constructor(processorType: ProcessorType = ProcessorType.TESSERACT) {
    this.processorType = processorType;
  }

  async extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Check if file is PDF
      if (mimeType === 'application/pdf') {
        console.log('PDF detected, using Textract if available...');
        if (textractClient) {
          return await this.processTextract(fileBuffer);
        } else {
          throw new Error('PDF processing requires Textract. Please use image files with Tesseract.');
        }
      }

      // For images, use selected processor
      if (this.processorType === ProcessorType.TESSERACT) {
        return await this.processTesseract(fileBuffer);
      } else if (textractClient) {
        return await this.processTextract(fileBuffer);
      } else {
        console.log('Textract not available, using Tesseract...');
        return await this.processTesseract(fileBuffer);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  private async processTesseract(fileBuffer: Buffer): Promise<string> {
    const worker = await createWorker({
      logger: progress => console.log('Tesseract progress:', progress)
    });
    
    try {
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      // Convert buffer to base64
      const base64Image = fileBuffer.toString('base64');
      const { data: { text } } = await worker.recognize(`data:image/png;base64,${base64Image}`);
      return text;
    } finally {
      await worker.terminate();
    }
  }

  private async processTextract(fileBuffer: Buffer): Promise<string> {
    if (!textractClient) {
      throw new Error('Textract client not initialized');
    }

    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['FORMS', 'TABLES']
    });

    const response = await textractClient.send(command);
    return this.parseTextractResponse(response);
  }

  private parseTextractResponse(response: any): string {
    let text = '';
    if (response.Blocks) {
      response.Blocks.forEach((block: any) => {
        if (block.BlockType === 'LINE') {
          text += block.Text + '\n';
        }
      });
    }
    return text;
  }

  setProcessor(type: ProcessorType) {
    this.processorType = type;
  }
} 