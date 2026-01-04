import Database from 'better-sqlite3';
import { join } from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const dbPath = join(process.cwd(), 'public', 'build.db');
    const db = new Database(dbPath, { readonly: true });
    
    const { search } = req.query;
    let query = 'SELECT * FROM devices';
    let params = [];

    if (search) {
      query += ' WHERE model LIKE ? OR model_norm LIKE ? OR series LIKE ?';
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    query += ' ORDER BY model';

    const stmt = db.prepare(query);
    const devices = stmt.all(...params);
    
    db.close();
    
    return res.status(200).json({ devices });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message });
  }
}