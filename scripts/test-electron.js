#!/usr/bin/env node
/**
 * Test script to validate Electron functionality
 * This script tests Electron components without requiring GUI
 */

const path = require('path');
const fs = require('fs');

// Test if Electron is properly installed
function testElectronInstallation() {
  console.log('🔍 Testing Electron installation...');
  
  try {
    const electronPath = require('electron');
    console.log('✅ Electron package found');
    
    // Check if electron binary exists
    const electronBinary = path.join(__dirname, '../node_modules/electron/dist/electron');
    if (fs.existsSync(electronBinary)) {
      console.log('✅ Electron binary found');
    } else {
      console.log('⚠️  Electron binary not found - may be in different location');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Electron package not found:', error.message);
    return false;
  }
}

// Test Electron main process script
function testMainProcess() {
  console.log('\n🔍 Testing Electron main process...');
  
  try {
    const mainPath = path.join(__dirname, '../electron/main.js');
    
    if (!fs.existsSync(mainPath)) {
      console.error('❌ Main process file not found');
      return false;
    }
    
    // Basic syntax check
    const mainContent = fs.readFileSync(mainPath, 'utf8');
    
    // Check for required components
    const requiredComponents = [
      'BrowserWindow',
      'app.whenReady',
      'createWindow',
      'mainWindow.loadURL'
    ];
    
    let allComponentsFound = true;
    requiredComponents.forEach(component => {
      if (mainContent.includes(component)) {
        console.log(`✅ Found ${component}`);
      } else {
        console.log(`❌ Missing ${component}`);
        allComponentsFound = false;
      }
    });
    
    return allComponentsFound;
  } catch (error) {
    console.error('❌ Error testing main process:', error.message);
    return false;
  }
}

// Test preload script
function testPreloadScript() {
  console.log('\n🔍 Testing Electron preload script...');
  
  try {
    const preloadPath = path.join(__dirname, '../electron/preload.js');
    
    if (!fs.existsSync(preloadPath)) {
      console.error('❌ Preload script not found');
      return false;
    }
    
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    
    if (preloadContent.includes('contextBridge')) {
      console.log('✅ Context bridge found');
    } else {
      console.log('⚠️  No context bridge - may not expose APIs to renderer');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing preload script:', error.message);
    return false;
  }
}

// Test Next.js server integration
function testNextIntegration() {
  console.log('\n🔍 Testing Next.js server integration...');
  
  try {
    const serverPath = path.join(__dirname, '../server.js');
    
    if (!fs.existsSync(serverPath)) {
      console.error('❌ Server.js not found');
      return false;
    }
    
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('next')) {
      console.log('✅ Next.js integration found');
    } else {
      console.log('❌ Next.js integration missing');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Next.js integration:', error.message);
    return false;
  }
}

// Test build configuration
function testBuildConfig() {
  console.log('\n🔍 Testing build configuration...');
  
  try {
    const packagePath = path.join(__dirname, '../package.json');
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Check scripts
    const requiredScripts = ['electron', 'electron-dev', 'build-electron', 'dist'];
    let allScriptsFound = true;
    
    requiredScripts.forEach(script => {
      if (packageContent.scripts && packageContent.scripts[script]) {
        console.log(`✅ Found script: ${script}`);
      } else {
        console.log(`❌ Missing script: ${script}`);
        allScriptsFound = false;
      }
    });
    
    // Check build configuration
    if (packageContent.build) {
      console.log('✅ Electron-builder configuration found');
    } else {
      console.log('❌ Electron-builder configuration missing');
      allScriptsFound = false;
    }
    
    return allScriptsFound;
  } catch (error) {
    console.error('❌ Error testing build config:', error.message);
    return false;
  }
}

// Check environment compatibility
function checkEnvironment() {
  console.log('\n🔍 Checking environment...');
  
  const isContainer = process.env.DOCKER || process.env.CONTAINER || process.env.CODESPACE_NAME;
  const isLinux = process.platform === 'linux';
  const hasDisplay = process.env.DISPLAY;
  
  if (isContainer) {
    console.log('⚠️  Container environment detected');
    if (!hasDisplay) {
      console.log('⚠️  No DISPLAY variable - GUI applications may not work');
    }
  } else {
    console.log('✅ Native environment detected');
  }
  
  console.log(`📍 Platform: ${process.platform}`);
  console.log(`📍 Node.js: ${process.version}`);
  
  return true;
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Electron functionality tests...\n');
  
  const results = {
    installation: testElectronInstallation(),
    mainProcess: testMainProcess(),
    preloadScript: testPreloadScript(),
    nextIntegration: testNextIntegration(),
    buildConfig: testBuildConfig(),
    environment: checkEnvironment()
  };
  
  console.log('\n📊 Test Results:');
  console.log('==================');
  
  let passedTests = 0;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    if (passed) passedTests++;
  });
  
  console.log(`\n🎯 Summary: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All Electron functionality tests passed!');
    console.log('💡 Note: GUI functionality requires a display environment');
  } else {
    console.log('⚠️  Some tests failed - check the errors above');
  }
  
  return passedTests === totalTests;
}

// Run the tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests };
