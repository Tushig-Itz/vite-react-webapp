import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'

// Dev-only API: serves /api/devices straight from public/build.db so
// `npm run dev` works on its own (no separate Express server needed).
function devApi() {
  return {
    name: 'dev-api-devices',
    configureServer(server) {
      server.middlewares.use('/api/devices', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const dbPath = join(process.cwd(), 'public', 'build.db')
          if (!existsSync(dbPath)) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'public/build.db not found - run `npm run build` first' }))
            return
          }
          const db = new Database(dbPath, { readonly: true })
          const devices = db.prepare('SELECT * FROM devices ORDER BY model').all()
          db.close()
          res.end(JSON.stringify({ devices }))
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
})
