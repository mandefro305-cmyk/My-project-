const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3000;

// Connect to SQLite DB
const db = new sqlite3.Database('./tourism.db', (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to the tourism SQLite database.');
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'secret-key-for-tourism-app',
    resave: false,
    saveUninitialized: true
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

app.get('/', (req, res) => {
    db.all("SELECT * FROM places", [], (err, rows) => {
        if (err) throw err;
        res.render('index', { places: rows });
    });
});

app.get('/place/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM places WHERE id = ?", [id], (err, row) => {
        if (err) throw err;
        if (!row) return res.status(404).send("Place not found");
        res.render('place', { place: row });
    });
});

// Serve other static HTML-converted-to-EJS pages directly for now
app.get('/destinations', (req, res) => res.render('destinations'));
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

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) throw err;
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
app.get('/admin', isAuthenticated, (req, res) => {
    db.all("SELECT * FROM places", [], (err, rows) => {
        if (err) throw err;
        res.render('admin', { places: rows });
    });
});

// Admin Add Place
app.post('/admin/add', isAuthenticated, (req, res) => {
    const { name, description, image_url, video_url } = req.body;
    db.run("INSERT INTO places (name, description, image_url, video_url) VALUES (?, ?, ?, ?)",
        [name, description, image_url, video_url], function (err) {
            if (err) throw err;
            res.redirect('/admin');
        });
});

// Admin Delete Place
app.post('/admin/delete/:id', isAuthenticated, (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM places WHERE id = ?", [id], function (err) {
        if (err) throw err;
        res.redirect('/admin');
    });
});


app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});
