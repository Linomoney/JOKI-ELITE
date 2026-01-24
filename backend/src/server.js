const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// 2. KONEKSI KE SUPABASE
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

// 3. INITIALIZE DATABASE
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        project_name VARCHAR(255) NOT NULL,
        progress INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ SYSTEM ONLINE: Postgres Connected & Table Ready");
  } catch (err) {
    console.error("❌ DATABASE ERROR:", err.message);
  }
};
initDb();

// 4. API ROUTES (Harus di atas app.listen)

// API: AMBIL SEMUA MISSION (Untuk Admin & Portfolio)
app.get('/api/admin/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: CARI SATU MISSION (Versi Anti-Gagal)
app.get('/api/track/:order_id', async (req, res) => {
  // .trim() buang spasi, .toUpperCase() samain huruf
  const order_id = req.params.order_id.trim().toUpperCase();
  
  try {
    // Kita paksa database cari pake huruf besar juga biar sinkron
    const result = await pool.query(
      'SELECT * FROM orders WHERE UPPER(order_id) = $1', 
      [order_id]
    );
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "MISSION ID TIDAK DITEMUKAN" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: INPUT/UPDATE MISSION (UPSERT)
app.post('/api/track', async (req, res) => {
  const { order_id, project_name, progress, status } = req.body;
  try {
    const query = `
      INSERT INTO orders (order_id, project_name, progress, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (order_id) 
      DO UPDATE SET 
        project_name = EXCLUDED.project_name,
        progress = EXCLUDED.progress,
        status = EXCLUDED.status
      RETURNING *;
    `;
    const result = await pool.query(query, [order_id, project_name, progress, status]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. START SERVER (Selalu paling bawah)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 MAINFRAME LIVE ON PORT ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
});