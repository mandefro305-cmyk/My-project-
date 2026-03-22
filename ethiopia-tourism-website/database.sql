CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    video_url TEXT
);

-- Insert a default admin user (password: 'admin')
INSERT INTO users (username, password) VALUES ('admin', '$2b$10$wTf7tPOnv81wZ0j4x9xT1ObM19PZ43177Q82q81kH2n178N29gZl.');

-- Insert some default places
INSERT INTO places (name, description, image_url, video_url)
VALUES ('Lalibela Rock-Hewn Churches', 'Lalibela is famous for its rock-hewn churches carved into stone.', 'lalibela.jpg', 'https://www.youtube.com/embed/dQw4w9WgXcQ');

INSERT INTO places (name, description, image_url, video_url)
VALUES ('Simien Mountains National Park', 'Beautiful national park with dramatic mountains.', 'simien.jpg', 'https://www.youtube.com/embed/dQw4w9WgXcQ');

INSERT INTO places (name, description, image_url, video_url)
VALUES ('Entoto Park', 'A scenic park on the outskirts of Addis Ababa.', 'entoto.jpg', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
