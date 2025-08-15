// Script to extract baseline from TL file
const http = require('http');

async function extractBaseline() {
  console.log('🔍 Extracting baseline from TL file...');
  
  try {
    // Make request to our inspection API
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/inspect-tl-data',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('📊 TL File Analysis Results:');
          console.log('=====================================');
          
          if (result.success) {
            console.log(`Found ${result.tl_files_found} TL files`);
            
            if (result.recommended_baseline) {
              console.log('\n✅ BASELINE FOUND:');
              console.log(`💰 Baseline Cost: ${result.recommended_baseline.formatted}`);
              console.log(`📁 Source File: ${result.recommended_baseline.source_file}`);
              console.log(`🎯 Confidence: ${result.recommended_baseline.confidence}`);
              
              console.log('\n📈 Data Analysis:');
              if (result.recommended_file) {
                const file = result.recommended_file;
                console.log(`- Total rows: ${file.data_structure?.total_rows || 'N/A'}`);
                console.log(`- Freight values found: ${file.freight_costs_found?.length || 0}`);
                console.log(`- Processing status: ${file.processing_status}`);
                
                if (file.freight_costs_found && file.freight_costs_found.length > 0) {
                  console.log('\n💡 Top freight costs found:');
                  file.freight_costs_found.slice(0, 5).forEach((cost, i) => {
                    console.log(`  ${i+1}. ${cost.column}: ${cost.formatted_value} (Row ${cost.row_index})`);
                  });
                }
              }
              
              console.log('\n🔧 Next Steps:');
              result.next_steps.forEach((step, i) => {
                console.log(`${i+1}. ${step}`);
              });
              
            } else {
              console.log('\n❌ NO BASELINE FOUND');
              console.log('The TL file may need to be processed in Data Processor first.');
            }
            
          } else {
            console.log('❌ Analysis failed:', result.error);
          }
          
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError.message);
          console.log('Raw response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
    });

    req.end();
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Run the extraction
extractBaseline();
