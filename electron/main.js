const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const { autoUpdater } = require('electron-updater');

let mainWindow;
let serverProcess;

// Determine if we're in development or production
const isPackaged = app.isPackaged;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your app icon
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

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
  const serverPath = path.join(process.resourcesPath, 'app');
  const nodeModulesPath = path.join(serverPath, 'node_modules');
  
  // Use the bundled Next.js server
  const serverScript = path.join(serverPath, 'server.js');
  
  // Set environment variables
  process.env.NODE_ENV = 'production';
  process.env.PORT = '3000';
  
  // Start the server process
  serverProcess = spawn('node', [serverScript], {
    cwd: serverPath,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3000',
      PATH: process.env.PATH + `:${path.join(nodeModulesPath, '.bin')}`
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
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto updater (optional)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
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
