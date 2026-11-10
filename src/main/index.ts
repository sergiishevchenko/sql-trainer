import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import { IPC_INVOKE } from '@shared/ipc/channels'
import { createAppContext, type AppContext } from './app-context'
import { WorkerExecutor } from './engine/executor'
import { tr } from './i18n'
import { createDispatcher } from './ipc/dispatcher'
import { createHandlers } from './ipc/handlers'
import { contentDir, databasePath, sqlWasmPath, userContentDir, workerScriptPath } from './paths'
import { applySessionHardening, isTrustedSender, secureWebPreferences } from './security/hardening'
import { FileTokenStore } from './security/token-store'
import packageJson from '../../package.json'

if (process.env.SQL_MASTERY_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.SQL_MASTERY_USER_DATA))
}

const devServerUrl = process.env.ELECTRON_RENDERER_URL
let mainWindow: BrowserWindow | null = null
let context: AppContext | null = null

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

function createWindow(): BrowserWindow {
  nativeTheme.themeSource = 'dark'
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#09090b',
    title: 'SQL Mastery',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 18 },
    autoHideMenuBar: true,
    webPreferences: secureWebPreferences(path.join(__dirname, '../preload/index.js'))
  })
  window.once('ready-to-show', () => window.show())
  if (devServerUrl) void window.loadURL(devServerUrl)
  else void window.loadFile(path.join(__dirname, '../renderer/index.html'))
  return window
}

async function bootstrap(): Promise<void> {
  applySessionHardening(devServerUrl)
  const wasmPath = sqlWasmPath()
  context = await createAppContext({
    databasePath: databasePath(),
    contentDir: contentDir(),
    extraExerciseDirs: [userContentDir()],
    wasmPath,
    executorFactory: (datasetsDir) => new WorkerExecutor({ scriptPath: workerScriptPath(), datasetsDir, wasmPath }),
    tokenStore: new FileTokenStore(path.join(app.getPath('userData'), 'session.json'))
  })

  for (const issue of context.catalog.issues) {
    console.warn(`[content] ${issue.file}${issue.exerciseId ? ` (${issue.exerciseId})` : ''}: ${issue.message}`)
  }

  const handlers = createHandlers(context, {
    version: packageJson.version,
    platform: process.platform,
    userDataPath: app.getPath('userData')
  })
  const dispatch = createDispatcher(handlers, context.session)

  ipcMain.handle(IPC_INVOKE, async (event, channel: unknown, payload: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!isTrustedSender(window, event.senderFrame?.url, devServerUrl)) {
      return { ok: false, error: { code: 'forbidden', message: 'errors.untrustedSender' } }
    }
    return dispatch(channel as string, payload)
  })

  mainWindow = createWindow()
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(async () => {
  try {
    await bootstrap()
  } catch (error) {
    console.error(error)
    dialog.showErrorBox('SQL Mastery', tr('app.startupFailed', { message: (error as Error).message }))
    app.exit(1)
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && context) mainWindow = createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

let closing = false
app.on('before-quit', (event) => {
  if (closing || !context) return
  closing = true
  event.preventDefault()
  void context.close().finally(() => app.exit(0))
})
