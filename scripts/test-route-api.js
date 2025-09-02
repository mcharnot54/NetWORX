const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/extract-actual-routes',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      console.log('🔍 Route Extraction API Response:');
      console.log(`✅ Success: ${result.success}`);
      console.log(`📊 Total routes: ${result.summary?.total_routes_extracted}`);
      console.log(`📁 Files processed: ${result.summary?.files_analyzed?.length}`);
      
      if (result.route_groups) {
        const routePairs = Object.keys(result.route_groups);
        console.log(`\n🛣️ Route pairs found (${routePairs.length}):`);
        routePairs.slice(0, 10).forEach((pair, index) => {
          const route = result.route_groups[pair];
          console.log(`  ${index + 1}. ${pair} (${route.origin} → ${route.destination})`);
        });
        
        // Extract unique origins and destinations
        const origins = new Set();
        const destinations = new Set();
        
        Object.values(result.route_groups).forEach(route => {
          if (route.origin && route.origin !== 'Unknown') origins.add(route.origin);
          if (route.destination && route.destination !== 'Unknown') destinations.add(route.destination);
        });
        
        console.log(`\n🏙️ Unique origins (${origins.size}):`);
        [...origins].slice(0, 10).forEach(origin => console.log(`  - ${origin}`));
        
        console.log(`\n🎯 Unique destinations (${destinations.size}):`);
        [...destinations].slice(0, 10).forEach(dest => console.log(`  - ${dest}`));
      }
      
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

req.end();
