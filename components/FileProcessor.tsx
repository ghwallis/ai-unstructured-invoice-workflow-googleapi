'use client'

import { createWorker } from 'tesseract.js';
import { useState } from 'react';
import { parseExtractedText } from '@/utils/textProcessing';

export function FileProcessor() {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [rawText, setRawText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const processFile = async (file: File) => {
    try {
      setStatus('Loading Tesseract...');
      const worker = await createWorker({
        logger: m => {
          console.log(m);
          if (m.status === 'loading tesseract core') {
            setStatus('Loading Tesseract core...');
          } else if (m.status === 'loading language traineddata') {
            setStatus('Loading language data...');
          } else if (m.status === 'recognizing text') {
            setStatus(`Recognizing text: ${Math.floor(m.progress * 100)}%`);
            setProgress(m.progress);
          } else {
            setStatus(`${m.status}: ${Math.floor(m.progress * 100)}%`);
            setProgress(m.progress);
          }
        },
        errorHandler: err => {
          console.error('Tesseract Error:', err);
          setStatus(`Error: ${err.message}`);
        }
      });

      setStatus('Initializing...');
      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      setStatus('Processing image...');
      try {
        const { data: { text } } = await worker.recognize(file);
        console.log('Raw extracted text:', text);
        setRawText(text);
        
        if (!text || text.trim() === '') {
          throw new Error('No text was extracted from the image');
        }

        const processedData = parseExtractedText(text);
        setResult(processedData);
        setStatus('Done!');
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to process file'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    setRawText('');
    setProgress(0);
    
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    
    if (!file) {
      setStatus('Error: No file selected');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatus('Error: Please select an image file');
      return;
    }

    console.log('Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    await processFile(file);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="file"
            name="file"
            accept="image/*"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Process Image
        </button>
      </form>

      {status && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p>{status}</p>
          {progress > 0 && progress < 1 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${Math.floor(progress * 100)}%` }}
              ></div>
            </div>
          )}
        </div>
      )}

      {rawText && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Raw Extracted Text:</h2>
          <pre className="whitespace-pre-wrap text-sm">{rawText}</pre>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h2 className="font-semibold mb-2">Processed Data:</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
} 