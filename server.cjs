const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Database connection
const dbPath = path.join(__dirname, 'public', 'build.db');
console.log('📍 Database path:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
        process.exit(1);
    } else {
        console.log('✓ Connected to database');
    }
});

// Test database
db.get('SELECT COUNT(*) as count FROM devices', [], (err, row) => {
    if (err) {
        console.error('❌ Query error:', err.message);
    } else {
        console.log(`✓ Database verified: ${row.count} devices`);
    }
});

// API Routes
app.get('/api/devices', (req, res) => {
    console.log('📡 GET /api/devices');
    
    db.all('SELECT * FROM devices ORDER BY model', [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✓ Returned ${rows.length} devices`);
        res.json({ devices: rows });
    });
});

// Serve static files AND handle SPA routing
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

app.use(express.static(distPath));

// Fallback for SPA - handle all other GET requests
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(indexPath);
    } else {
        next();
    }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 Server running at http://localhost:' + PORT + '\n');
});

process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down...');
    db.close();
    process.exit(0);
});