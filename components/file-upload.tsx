'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Cloud, File, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { processInvoice } from '@/app/actions'
import type { ExtractedData } from '@/app/actions'

const DisplayField = ({ label, value }: { label: string; value?: string }) => (
  <div className="grid grid-cols-2 gap-1">
    <span className="text-sm font-medium">{label}:</span>
    <span className="text-sm">
      {value || <span className="text-muted-foreground italic">Not found</span>}
    </span>
  </div>
);

export function FileUpload() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsProcessing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('invoice', acceptedFiles[0])
      
      const data = await processInvoice(formData)
      setExtractedData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process invoice')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors ${
              isDragActive ? 'border-primary' : 'border-muted'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              <Cloud className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your invoice here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, PNG, and JPEG
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>Processing invoice...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 text-destructive">
              <h4 className="font-semibold">Error Processing Invoice</h4>
              <p className="text-sm">{error}</p>
              <p className="text-xs text-muted-foreground">
                Please ensure your file is a valid PDF or image (PNG/JPEG) under 5MB.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {extractedData && !isProcessing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Extracted Data</h3>
              
              <div className="grid gap-2">
                <DisplayField label="Invoice Number" value={extractedData.invoiceNumber} />
                <DisplayField label="Date" value={extractedData.date} />
                <DisplayField label="Vendor" value={extractedData.vendor} />
                <DisplayField label="Vendor Address" value={extractedData.vendorAddress} />
                <DisplayField label="Total" value={extractedData.total} />
              </div>

              {extractedData.lineItems && extractedData.lineItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Line Items</h4>
                  <div className="rounded-lg border">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="divide-x divide-border">
                          <th className="px-4 py-2 text-left text-sm font-medium">Description</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Quantity</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Unit Price</th>
                          <th className="px-4 py-2 text-left text-sm font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {extractedData.lineItems.map((item, index) => (
                          <tr key={index} className="divide-x divide-border">
                            <td className="px-4 py-2 text-sm">{item.description}</td>
                            <td className="px-4 py-2 text-sm">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm">{item.unitPrice}</td>
                            <td className="px-4 py-2 text-sm">{item.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setExtractedData(null)}>
                  Process Another Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

