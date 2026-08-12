import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'

// Maps the ?type= query param to its table. Defaults to firewall.
const TABLE_BY_TYPE: Record<string, string> = {
  firewall: 'devices',
  switch: 'switches',
  ap: 'aps',
}

// Dev-only API: serves /api/devices straight from public/build.db so
// `npm run dev` works on its own (no separate API server needed).
function devApi() {
  return {
    name: 'dev-api-devices',
    configureServer(server: any) {
      server.middlewares.use('/api/devices', (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          const url = new URL(req.url, 'http://localhost')
          const type = url.searchParams.get('type') || 'firewall'
          const table = TABLE_BY_TYPE[type]
          if (!table) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: `Unknown type "${type}"` }))
            return
          }
          const dbPath = join(process.cwd(), 'public', 'build.db')
          if (!existsSync(dbPath)) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'public/build.db not found - run `npm run build` first' }))
            return
          }
          const db = new Database(dbPath, { readonly: true })
          const devices = db.prepare(`SELECT * FROM "${table}" ORDER BY model`).all()
          db.close()
          res.end(JSON.stringify({ devices }))
        } catch (e: any) {
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
