import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Look in ROOT, not public/
    const dbPath = join(process.cwd(), 'build.db');
    
    // Debug
    if (!existsSync(dbPath)) {
      console.error('Database not found at:', dbPath);
      console.error('Files in root:', require('fs').readdirSync(process.cwd()));
      return res.status(500).json({ 
        error: 'Database file not found',
        path: dbPath,
        cwd: process.cwd()
      });
    }
    
    const db = new Database(dbPath, { readonly: true });
    
    const { search } = req.query;
    let query = 'SELECT * FROM devices';
    let params = [];

    if (search) {
      const normalized = search.toLowerCase().replace(/[^a-z0-9]/g, '');
      query += ' WHERE model LIKE ? OR model_norm LIKE ? OR series LIKE ?';
      params = [`%${search}%`, `%${normalized}%`, `%${search}%`];
    }

    query += ' ORDER BY model';

    const stmt = db.prepare(query);
    const devices = stmt.all(...params);
    db.close();
    
    return res.status(200).json({ devices });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}