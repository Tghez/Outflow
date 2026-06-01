import { config } from './config.js'
import { createApp } from './app.js'
import { startScheduler } from './services/scheduler.js'

const app = createApp()

app.listen(config.port, () => {
  console.log(`[server] Outflow backend running on http://localhost:${config.port}`)
  console.log(`[server] Environment: ${config.nodeEnv}`)
})

startScheduler()
