// Alternative: SQLite with spatial indexing
// npm install sqlite3 spatialite

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SpatialiteService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/geo.db');
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else {
          // Enable SpatiaLite extension
          this.db.loadExtension('mod_spatialite', (err) => {
            if (err) {
              console.log('SpatiaLite not available, using basic SQLite');
            }
            this.createTables();
            resolve();
          });
        }
      });
    });
  }

  createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS volcanoes (
        id INTEGER PRIMARY KEY,
        name TEXT,
        lat REAL,
        lon REAL,
        properties TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS peaks (
        id INTEGER PRIMARY KEY,
        name TEXT,
        lat REAL,
        lon REAL,
        properties TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS coastlines (
        id INTEGER PRIMARY KEY,
        name TEXT,
        lat REAL,
        lon REAL,
        properties TEXT
      )`
    ];

    tables.forEach(sql => this.db.run(sql));
    
    // Create spatial indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_volcanoes_location ON volcanoes(lat, lon)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_peaks_location ON peaks(lat, lon)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_coastlines_location ON coastlines(lat, lon)');
  }

  async findNearby(lat, lon, radiusKm) {
    const latRange = radiusKm / 111;
    const lonRange = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    
    const query = `
      SELECT 'volcano' as type, name, lat, lon FROM volcanoes 
      WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
      UNION ALL
      SELECT 'peak' as type, name, lat, lon FROM peaks 
      WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
      UNION ALL
      SELECT 'coastline' as type, name, lat, lon FROM coastlines 
      WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?
    `;
    
    const params = [
      lat - latRange, lat + latRange, lon - lonRange, lon + lonRange,
      lat - latRange, lat + latRange, lon - lonRange, lon + lonRange,
      lat - latRange, lat + latRange, lon - lonRange, lon + lonRange
    ];
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = SpatialiteService;