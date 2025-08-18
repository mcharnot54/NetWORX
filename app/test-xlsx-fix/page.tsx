"use client";

import { useState } from 'react';

export default function TestXLSXFix() {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testXLSX = async () => {
    setIsLoading(true);
    try {
      // Test the enhanced excel validator
      const { EnhancedExcelValidator } = await import('@/lib/enhanced-excel-validator');
      
      // Create a test file blob (minimal Excel content)
      const testBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const testFile = new File([testBlob], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const validator = new EnhancedExcelValidator({}, (msg, level) => {
        console.log(`[${level}] ${msg}`);
      });

      // This should not throw "XLSX is not defined" error anymore
      try {
        await validator.processExcelFile(testFile, 'transport');
        setTestResult('✅ XLSX import fix successful - No "XLSX is not defined" error');
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('XLSX is not defined')) {
            setTestResult('❌ XLSX import fix failed - Still getting "XLSX is not defined" error');
          } else {
            setTestResult(`✅ XLSX import fix successful - Got expected processing error: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      setTestResult(`❌ Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">XLSX Import Fix Test</h1>
      
      <div className="space-y-4">
        <button
          onClick={testXLSX}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test XLSX Import Fix'}
        </button>
        
        {testResult && (
          <div className={`p-4 rounded ${
            testResult.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {testResult}
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <p>This test verifies that the enhanced-excel-validator can import XLSX dynamically without the "XLSX is not defined" error.</p>
        <p>The test should show a successful import or an expected processing error (not an XLSX import error).</p>
      </div>
    </div>
  );
}
