const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const { autoUpdater } = require('electron-updater');

// Handle running in container environments
const isContainerEnv = process.env.DOCKER || process.env.CONTAINER || process.env.CODESPACE_NAME;

// Disable hardware acceleration in container environments
if (isContainerEnv) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-dev-shm-usage');
  app.commandLine.appendSwitch('--disable-web-security');
}

let mainWindow;
let serverProcess;

// Determine if we're in development or production
const isPackaged = app.isPackaged;

function createWindow() {
  try {
    // Create the browser window
    const windowOptions = {
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: !isContainerEnv, // Disable web security in container environments
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'assets/icon.png'),
      show: false, // Don't show until ready
      titleBarStyle: 'default'
    };

    // Add container-specific options
    if (isContainerEnv) {
      windowOptions.webPreferences.sandbox = false;
    }

    mainWindow = new BrowserWindow(windowOptions);
  } catch (error) {
    console.error('Failed to create Electron window:', error);
    // In container environments, this might fail, but we can still serve the web app
    if (isContainerEnv) {
      console.log('Running in container environment - Electron GUI may not be available');
      return;
    }
    throw error;
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on window creation
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (isDev) {
    // In development, connect to the dev server
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // In production, wait for the Next.js server to start
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000');
    }, 3000); // Give server time to start
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  if (isDev) {
    // In development, assume dev server is running
    return;
  }

  // In production, start the Next.js server
  const appPath = isPackaged ? path.join(process.resourcesPath, 'app') : process.cwd();
  const serverScript = path.join(appPath, 'server.js');

  console.log('Starting Next.js server from:', appPath);
  console.log('Server script path:', serverScript);

  // Check if server.js exists
  const fs = require('fs');
  if (!fs.existsSync(serverScript)) {
    console.error('Server script not found at:', serverScript);
    console.log('Available files in app directory:');
    try {
      const files = fs.readdirSync(appPath);
      console.log(files);
    } catch (err) {
      console.error('Could not read app directory:', err);
    }
    return;
  }

  // Set environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3000';
  process.env.HOSTNAME = 'localhost';

  // Start the server process
  serverProcess = spawn('node', [serverScript], {
    cwd: appPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      HOSTNAME: 'localhost'
    },
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`Next.js server process exited with code ${code}`);
  });
}

// App event handlers
app.whenReady().then(() => {
  startNextServer();

  try {
    createWindow();
  } catch (error) {
    console.error('Failed to create window:', error);
    if (isContainerEnv) {
      console.log('Container environment detected - GUI not available. Web app available at http://localhost:3000');
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        createWindow();
      } catch (error) {
        console.error('Failed to recreate window:', error);
      }
    }
  });

  // Auto updater (optional)
  if (!isDev && !isContainerEnv) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}).catch((error) => {
  console.error('Failed to initialize Electron app:', error);
  if (isContainerEnv) {
    console.log('Running in container - starting headless mode');
  }
});

app.on('window-all-closed', () => {
  // Kill the server process
  if (serverProcess) {
    serverProcess.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clean up server process
  if (serverProcess) {
    serverProcess.kill();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
