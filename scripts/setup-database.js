#!/usr/bin/env node

async function setupDatabase() {
  try {
    const response = await fetch('http://localhost:3000/api/setup-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Database setup successful!');
      console.log('Stats:', result.stats);
    } else {
      console.error('❌ Database setup failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error calling setup API:', error.message);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
