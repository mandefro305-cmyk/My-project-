const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./tourism.db');

const sql = fs.readFileSync('./database.sql', 'utf8');

db.serialize(() => {
    db.exec(sql, (err) => {
        if (err) {
            console.error('Error running SQL schema:', err);
        } else {
            console.log('Database initialized successfully.');
        }
    });
});

db.close();
