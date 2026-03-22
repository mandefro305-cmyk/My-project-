require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const port = 3000;

// Connect to SQLite DB and initialize tables if they don't exist
const db = new sqlite3.Database('./tourism.db', (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the tourism SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                image_url TEXT,
                video_url TEXT
            )`);
            // Insert default admin if none exists
            db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
                if (!row) {
                    db.run("INSERT INTO users (username, password) VALUES ('admin', '$2b$10$wTf7tPOnv81wZ0j4x9xT1ObM19PZ43177Q82q81kH2n178N29gZl.')");
                }
            });
        });
    }
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Auth Middleware
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// ----------------------------------------------------
// Frontend Routes
// ----------------------------------------------------

app.get('/', (req, res, next) => {
    db.all("SELECT * FROM places", [], (err, rows) => {
        if (err) return next(err);
        res.render('index', { places: rows });
    });
});

app.get('/place/:id', (req, res, next) => {
    const id = req.params.id;
    db.get("SELECT * FROM places WHERE id = ?", [id], (err, row) => {
        if (err) return next(err);
        if (!row) return res.status(404).send("Place not found");
        res.render('place', { place: row });
    });
});

// Serve other static HTML-converted-to-EJS pages directly for now
app.get('/destinations', (req, res) => res.render('destinations'));

// ----------------------------------------------------
// AI Chatbot API Route
// ----------------------------------------------------
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message || "";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userMessage,
            config: {
                systemInstruction: "You are an enthusiastic Ethiopian Tourism Expert. You provide concise, engaging, and accurate answers about Ethiopian tourism, including places like Lalibela, Simien Mountains, Entoto Park, Ethiopian food, culture, history, and travel tips. Keep your answers relatively short and helpful for a web chat widget. You use words like 'Selam!' for greetings.",
            }
        });

        res.json({ response: response.text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.json({ response: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later!" });
    }
});
app.get('/culture', (req, res) => res.render('culture'));
app.get('/guide', (req, res) => res.render('guide'));
app.get('/gallery', (req, res) => res.render('gallery'));
app.get('/blog', (req, res) => res.render('blog'));
app.get('/contact', (req, res) => res.render('contact'));

// ----------------------------------------------------
// Admin & Auth Routes
// ----------------------------------------------------

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res, next) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return next(err);
        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                req.session.userId = user.id;
                res.redirect('/admin');
            } else {
                res.render('login', { error: 'Invalid username or password' });
            }
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin Dashboard
app.get('/admin', isAuthenticated, (req, res, next) => {
    db.all("SELECT * FROM places", [], (err, rows) => {
        if (err) return next(err);
        res.render('admin', { places: rows });
    });
});

// Admin Add Place
app.post('/admin/add', isAuthenticated, (req, res, next) => {
    const { name, description, image_url, video_url } = req.body;
    db.run("INSERT INTO places (name, description, image_url, video_url) VALUES (?, ?, ?, ?)",
        [name, description, image_url, video_url], function (err) {
            if (err) return next(err);
            res.redirect('/admin');
        });
});

// Admin Delete Place
app.post('/admin/delete/:id', isAuthenticated, (req, res, next) => {
    const id = req.params.id;
    db.run("DELETE FROM places WHERE id = ?", [id], function (err) {
        if (err) return next(err);
        res.redirect('/admin');
    });
});


app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});
