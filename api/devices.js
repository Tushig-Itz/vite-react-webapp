import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

// Maps the ?type= query param to its table. Defaults to firewall.
const TABLE_BY_TYPE = {
  firewall: 'devices',
  switch: 'switches',
  ap: 'aps',
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const type = (req.query.type || 'firewall').toString();
    const table = TABLE_BY_TYPE[type];
    if (!table) {
      return res.status(400).json({ error: `Unknown type "${type}"` });
    }

    const dbPath = join(process.cwd(), 'public', 'build.db');
    if (!existsSync(dbPath)) {
      return res.status(500).json({ error: 'Database file not found', path: dbPath });
    }

    const db = new Database(dbPath, { readonly: true });

    const { search } = req.query;
    let query = `SELECT * FROM "${table}"`;
    let params = [];
    if (search) {
      const normalized = search.toLowerCase().replace(/[^a-z0-9]/g, '');
      query += ' WHERE model LIKE ? OR model_norm LIKE ? OR series LIKE ?';
      params = [`%${search}%`, `%${normalized}%`, `%${search}%`];
    }
    query += ' ORDER BY model';

    const devices = db.prepare(query).all(...params);
    db.close();

    return res.status(200).json({ devices });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message });
  }
}
