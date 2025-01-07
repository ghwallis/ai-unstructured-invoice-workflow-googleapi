'use client'

import { processInvoice } from '@/app/actions'
import { vendorDatabase } from '../utils/vendorDatabase'
import { useState } from 'react'

// Add new types
type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'needs_edit';
type EditableFields = { [key: string]: string | number };

// Add these types at the top
interface VendorHistory {
  invoiceNumber: string;
  date: string;
  amount: number;
  status: 'approved' | 'denied' | 'pending';
}

interface VendorSummary {
  totalInvoices: number;
  totalAmount: number;
  averageProcessingTime: number;
  approvalRate: number;
}

// Add these new types at the top
interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

export default function Home() {
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('pending');
  const [editableFields, setEditableFields] = useState<EditableFields>({});
  const [comments, setComments] = useState<string>('');
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([
    { id: 'upload', name: 'File Upload', status: 'pending' },
    { id: 'extract', name: 'Data Extraction', status: 'pending' },
    { id: 'validate', name: 'Validation', status: 'pending' },
    { id: 'process', name: 'Processing', status: 'pending' }
  ]);

  async function handleSubmit(formData: FormData) {
    // Reset states for new processing
    setResult(null);
    setStatus('Processing...');
    setProcessingStages(stages => 
      stages.map(stage => ({ ...stage, status: 'pending' }))
    );

    try {
      // Update upload stage
      setProcessingStages(stages =>
        stages.map(stage =>
          stage.id === 'upload' ? { ...stage, status: 'processing' } : stage
        )
      );

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessingStages(stages =>
        stages.map(stage =>
          stage.id === 'upload' ? { ...stage, status: 'completed' } :
          stage.id === 'extract' ? { ...stage, status: 'processing' } : stage
        )
      );

      // Process the invoice
      const response = await processInvoice(formData);

      if (response.success) {
        // Update extraction stage
        setProcessingStages(stages =>
          stages.map(stage =>
            stage.id === 'extract' ? { ...stage, status: 'completed' } :
            stage.id === 'validate' ? { ...stage, status: 'processing' } : stage
          )
        );

        // Simulate validation delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setProcessingStages(stages =>
          stages.map(stage =>
            stage.id === 'validate' ? { ...stage, status: 'completed' } :
            stage.id === 'process' ? { ...stage, status: 'processing' } : stage
          )
        );

        // Final processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProcessingStages(stages =>
          stages.map(stage =>
            stage.id === 'process' ? { ...stage, status: 'completed' } : stage
          )
        );

        setResult(response.data);
        setStatus('Done!');
      } else {
        setProcessingStages(stages =>
          stages.map(stage =>
            stage.status === 'processing' ? { ...stage, status: 'error' } : stage
          )
        );
        setStatus(`Error: ${response.error}`);
      }
    } catch (error) {
      setProcessingStages(stages =>
        stages.map(stage =>
          stage.status === 'processing' ? { ...stage, status: 'error' } : stage
        )
      );
      setStatus(`Error: ${error.message}`);
    }
  }

  // Function to extract key-value pairs from text
  const extractKeyValuePairs = (text: string) => {
    const lines = text.split('\n').map(line => line.trim());
    const pairs = [];
    let isAddress = false;
    let addressParts = [];
    let isLineItem = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle explicit key-value pairs with colons
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          pairs.push({ key, value });
        }
      } 
      // Handle labeled values without colons
      else if (line.match(/^(INVOICE|DATE|TOTAL|AMOUNT|RATE|HOURS)/)) {
        const key = line.match(/^[A-Z\s]+/)[0].trim();
        const value = line.replace(key, '').trim();
        if (value) {
          pairs.push({ key, value });
        }
      }
      // Handle company name and address
      else if (line.match(/^Market Financial/)) {
        pairs.push({ key: 'Company Name', value: line });
        isAddress = true;
        continue;
      }
      // Handle client name and address
      else if (line === 'TO:') {
        if (lines[i + 1]) {
          pairs.push({ key: 'Client Name', value: lines[i + 1] });
          if (lines[i + 2]) {
            pairs.push({ key: 'Client Company', value: lines[i + 2] });
          }
          isAddress = true;
          i += 2;
          continue;
        }
      }
      // Handle line items section
      else if (line === 'DESCRIPTION') {
        isLineItem = true;
        continue;
      }
      // Process line items
      else if (isLineItem && line.toLowerCase().includes('consultation services')) {
        pairs.push({ key: 'Description', value: line });
        // Look ahead for hours, rate, and amount
        for (let j = i + 1; j < i + 4; j++) {
          const value = lines[j]?.trim();
          if (value) {
            if (!pairs.find(p => p.key === 'Hours')) {
              pairs.push({ key: 'Hours', value });
              continue;
            }
            if (!pairs.find(p => p.key === 'Rate')) {
              pairs.push({ key: 'Rate', value });
              continue;
            }
            if (!pairs.find(p => p.key === 'Amount')) {
              pairs.push({ key: 'Amount', value });
              break;
            }
          }
        }
        isLineItem = false;
      }

      // Collect address parts
      if (isAddress) {
        if (line.match(/^(Phone|Fax|INVOICE|TO:|FOR:)/) || line === '') {
          if (addressParts.length > 0) {
            pairs.push({ 
              key: pairs[pairs.length - 1].key === 'Company Name' ? 'Company Address' : 'Client Address',
              value: addressParts.join(', ') 
            });
            addressParts = [];
            isAddress = false;
          }
        } else if (line.match(/^[0-9]|[A-Za-z]/)) {
          addressParts.push(line);
        }
      }

      // Handle service description
      if (line === 'FOR:' && lines[i + 1]) {
        pairs.push({ key: 'Service', value: lines[i + 1] });
      }

      // Handle payment terms
      if (line.includes('Total due in')) {
        pairs.push({ key: 'Payment Terms', value: line });
      }
    }

    return pairs;
  };

  const handleApprovalChange = (status: ApprovalStatus) => {
    setApprovalStatus(status);
  };

  const handleFieldEdit = (field: string, value: string) => {
    setEditableFields({ ...editableFields, [field]: value });
  };

  const handleApprovalSubmit = async () => {
    // Here you would implement the logic to submit the approval decision
    // This could include sending to a backend API, updating a database, etc.
    const approvalData = {
      invoiceId: result.structured.invoice_details.number,
      status: approvalStatus,
      edits: editableFields,
      comments,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Approval submitted:', approvalData);
    setStatus(`Invoice ${approvalStatus.replace('_', ' ')}`);
  };

  // Add these helper functions
  const getVendorHistory = (vendorName: string): VendorHistory[] => {
    // This would typically come from your database
    // For now, we'll generate it based on the vendor name
    const mockHistory: { [key: string]: VendorHistory[] } = {
      'Market Financial Consulting': [
        { invoiceNumber: '00011', date: '2024-01-15', amount: 1125.00, status: 'approved' },
        { invoiceNumber: '00010', date: '2024-01-01', amount: 1500.00, status: 'approved' },
        { invoiceNumber: '00009', date: '2023-12-15', amount: 750.00, status: 'approved' }
      ],
      // Add more vendors as needed
    };

    return mockHistory[vendorName] || [];
  };

  const getVendorSummary = (vendorName: string): VendorSummary => {
    const history = getVendorHistory(vendorName);
    
    return {
      totalInvoices: history.length,
      totalAmount: history.reduce((sum, inv) => sum + inv.amount, 0),
      averageProcessingTime: 2.5, // In days
      approvalRate: (history.filter(inv => inv.status === 'approved').length / history.length) * 100
    };
  };

  const handleReset = () => {
    setResult(null);
    setStatus('');
    setProcessingStages(stages =>
      stages.map(stage => ({ ...stage, status: 'pending' }))
    );
    setApprovalStatus('pending');
    setEditableFields({});
    setComments('');
  };

  return (
    <main className="container py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Invoice Processor</h1>
          <p className="text-muted-foreground">
            Upload an invoice to extract and validate information
          </p>
        </div>

        <div className="mt-8">
          <form action={handleSubmit}>
            <input 
              type="file" 
              name="file" 
              accept="application/pdf,image/*" 
              className="block w-full text-sm text-gray-500 mb-4"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Process Invoice
            </button>
          </form>

          {status && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-gray-50 rounded">
                <p className="mb-4">{status}</p>
                <div className="space-y-3">
                  {processingStages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className="w-32 text-sm">{stage.name}</div>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            stage.status === 'completed' ? 'bg-green-500 w-full' :
                            stage.status === 'processing' ? 'bg-blue-500 w-full animate-pulse' :
                            stage.status === 'error' ? 'bg-red-500 w-full' :
                            'w-0'
                          }`}
                        />
                      </div>
                      <div className="w-6">
                        {stage.status === 'completed' && <span className="text-green-500">✓</span>}
                        {stage.status === 'error' && <span className="text-red-500">✗</span>}
                        {stage.status === 'processing' && <span className="text-blue-500">⋯</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {result && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Process Another Invoice
                </button>
              )}
            </div>
          )}

          {result?.structured && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6">Validation Results</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Extracted Invoice Data */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">
                    <span className="text-blue-600">📄</span> Extracted Invoice Data
                  </h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="font-medium">Vendor Name</dt>
                      <dd>{result.structured.vendor.name}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Address</dt>
                      <dd>{result.structured.vendor.address}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Contact</dt>
                      <dd>Phone: {result.structured.vendor.phone}</dd>
                      <dd>Fax: {result.structured.vendor.fax}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Rate</dt>
                      <dd>${result.structured.line_items[0]?.rate}/hour</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Payment Terms</dt>
                      <dd>{result.structured.invoice_details.payment_terms}</dd>
                    </div>
                  </dl>
                </div>

                {/* Database Vendor Profile */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">
                    <span className="text-green-600">💾</span> Vendor Database Profile
                  </h3>
                  {result.structured?.vendor?.name ? (
                    <dl className="space-y-4">
                      <div>
                        <dt className="font-medium">Registered Name</dt>
                        <dd>{result.structured.vendor.name}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Registered Address</dt>
                        <dd>{result.structured.vendor.address}</dd>
                      </div>
                      <div>
                        <dt className="font-medium">Contact Information</dt>
                        <dd>Phone: {result.structured.vendor.phone}</dd>
                        {result.structured.vendor.fax && <dd>Fax: {result.structured.vendor.fax}</dd>}
                      </div>
                      <div>
                        <dt className="font-medium">Standard Rate</dt>
                        <dd>${result.structured.line_items?.[0]?.rate}/hour</dd>
                      </div>
                      {result.validation?.vendorProfile && Object.entries(result.validation.vendorProfile).map(([key, value]) => (
                        <div key={key}>
                          <dt className="font-medium">
                            {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </dt>
                          <dd>{typeof value === 'object' ? JSON.stringify(value) : value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-gray-500">No vendor profile found</p>
                  )}
                </div>

                {/* Validation Results */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Validation Summary</h3>
                  
                  {result.validation && (
                    <div className="space-y-4">
                      {/* Overall Status */}
                      <div className={`p-4 rounded-lg ${
                        result.validation.isValid ? 'bg-green-50' : 'bg-yellow-50'
                      }`}>
                        <p className={`font-medium ${
                          result.validation.isValid ? 'text-green-800' : 'text-yellow-800'
                        }`}>
                          {result.validation.isValid ? 
                            '✓ Invoice passed validation' : 
                            '⚠️ Invoice requires review'}
                        </p>
                      </div>

                      {/* Validation Details */}
                      <div className="bg-white p-4 rounded-lg shadow">
                        <h4 className="font-medium mb-2">Validation Checks:</h4>
                        <ul className="space-y-2">
                          {result.validation?.checks?.length > 0 ? (
                            result.validation.checks.map((check, index) => (
                              <li key={index} className="flex items-start gap-2">
                                {check.status === 'success' ? (
                                  <span className="text-green-500">✓</span>
                                ) : check.status === 'warning' ? (
                                  <span className="text-yellow-500">⚠️</span>
                                ) : (
                                  <span className="text-red-500">✗</span>
                                )}
                                <div>
                                  <span>{check.message}</span>
                                  {check.details && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {check.details}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))
                          ) : (
                            <li className="text-gray-500">No validation checks available</li>
                          )}
                        </ul>
                      </div>

                      {/* Detailed Issues */}
                      {(result.validation.errors.length > 0 || result.validation.warnings.length > 0) && (
                        <div className="space-y-4">
                          {result.validation.errors.length > 0 && (
                            <div className="bg-red-50 p-4 rounded-lg">
                              <h4 className="text-red-800 font-medium mb-2">Errors to Address:</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {result.validation.errors.map((error, index) => (
                                  <li key={index} className="text-red-700">
                                    {error.message}
                                    <div className="text-sm">
                                      Expected: {error.expected}
                                      <br />
                                      Received: {error.received}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.validation.warnings.length > 0 && (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                              <h4 className="text-yellow-800 font-medium mb-2">Warnings:</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {result.validation.warnings.map((warning, index) => (
                                  <li key={index} className="text-yellow-700">
                                    {warning.message}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Approval Workflow Section */}
              <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Approval Workflow</h3>
                
                <div className="space-y-6">
                  {/* Approval Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decision
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={approvalStatus}
                      onChange={(e) => handleApprovalChange(e.target.value as ApprovalStatus)}
                    >
                      <option value="pending">Select Decision</option>
                      <option value="approved">Approve Invoice</option>
                      <option value="needs_edit">Approve with Edits</option>
                      <option value="denied">Deny Invoice</option>
                    </select>
                  </div>

                  {/* Edit Fields (shown when "Approve with Edits" is selected) */}
                  {approvalStatus === 'needs_edit' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Edit Fields</h4>
                      {Object.entries(result.structured.line_items[0]).map(([field, value]) => (
                        <div key={field} className="flex items-center gap-4">
                          <label className="block text-sm font-medium text-gray-700 w-1/4">
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                          </label>
                          <input
                            type="text"
                            className="flex-1 px-3 py-2 border rounded-md"
                            defaultValue={value as string}
                            onChange={(e) => handleFieldEdit(field, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add any comments about your decision..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleApprovalSubmit}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={approvalStatus === 'pending'}
                    >
                      Submit Decision
                    </button>
                    <button
                      onClick={() => {
                        setApprovalStatus('pending');
                        setEditableFields({});
                        setComments('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Features */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vendor Summary */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Vendor Summary</h3>
                  {result?.structured?.vendor?.name && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Invoices</div>
                          <div className="text-lg font-semibold">
                            {getVendorSummary(result.structured.vendor.name).totalInvoices}
                          </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Total Amount</div>
                          <div className="text-lg font-semibold">
                            ${getVendorSummary(result.structured.vendor.name).totalAmount.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Avg. Processing</div>
                          <div className="text-lg font-semibold">
                            {getVendorSummary(result.structured.vendor.name).averageProcessingTime} days
                          </div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded">
                          <div className="text-sm text-gray-600">Approval Rate</div>
                          <div className="text-lg font-semibold">
                            {getVendorSummary(result.structured.vendor.name).approvalRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice History */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Invoice History</h3>
                  {result?.structured?.vendor?.name ? (
                    <div className="text-sm">
                      <div className="space-y-2">
                        {getVendorHistory(result.structured.vendor.name).map((invoice) => (
                          <div key={invoice.invoiceNumber} 
                               className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">Invoice #{invoice.invoiceNumber}</div>
                              <div className="text-gray-500">{invoice.date}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${invoice.amount.toLocaleString()}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium
                                ${invoice.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                  invoice.status === 'denied' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'}`}>
                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Upload an invoice to see vendor history</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="md:col-span-2 bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 rounded border">
                      📧 Email Vendor
                      <span className="text-xs text-gray-500">({result?.structured?.vendor?.name})</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 rounded border">
                      📥 Download Invoice
                      <span className="text-xs text-gray-500">(#{result?.structured?.invoice_details?.number})</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 rounded border">
                      📊 View Analytics
                    </button>
                  </div>
                </div>
              </div>

              {/* Original Invoice Data */}
              <div className="mt-8 bg-gray-50 p-4 rounded-lg">
                <details>
                  <summary className="cursor-pointer font-medium">
                    Show Raw Invoice Data
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

