const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");

const PORT = 3000;
const MONGODB_URI = "mongodb://127.0.0.1:27017";

const client = new MongoClient(MONGODB_URI);

let db;

const sessions = new Map();

// Send JSON response
function sendJson(res, status, data, headers = {}) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        ...headers
    });

    res.end(JSON.stringify(data));
}

// Read data sent by frontend
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error("Invalid data"));
            }
        });
    });
}

// Get session cookie
function getSession(req) {
    const cookies = req.headers.cookie || "";

    const match = cookies.match(/myfolio_session=([^;]+)/);

    if (!match) return null;

    return sessions.get(match[1]);
}

// Hash password
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(
        password,
        salt,
        64
    ).toString("hex");

    return salt + ":" + hash;
}

// Verify password
function verifyPassword(password, savedPassword) {
    const parts = savedPassword.split(":");

    const salt = parts[0];

    const savedHash = Buffer.from(parts[1], "hex");

    const enteredHash = crypto.scryptSync(
        password,
        salt,
        64
    );

    return crypto.timingSafeEqual(
        savedHash,
        enteredHash
    );
}

// Clean text input
function clean(value) {
    return String(value || "").trim();
}

// Remove password before sending user data
function safeUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        headline: user.headline || "",
        about: user.about || "",
        education: user.education || "",
        skills: user.skills || [],
        contact: user.contact || ""
    };
}

// Handle API requests
async function handleAPI(req, res, url) {

    const route = url.pathname;
    const method = req.method;

    // REGISTER
    if (route === "/api/register" && method === "POST") {

        const data = await readBody(req);

        const name = clean(data.name);
        const email = clean(data.email).toLowerCase();
        const password = String(data.password || "");

        if (!name || !email || !password) {
            return sendJson(res, 400, {
                message: "Fill all fields."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return sendJson(res, 400, {
                message: "Enter a valid email."
            });
        }

        if (password.length < 6) {
            return sendJson(res, 400, {
                message: "Password must have 6 characters."
            });
        }

        const existing = await db.collection("users")
            .findOne({ email });

        if (existing) {
            return sendJson(res, 409, {
                message: "Email already registered."
            });
        }

        const newUser = {
            name,
            email,
            password: hashPassword(password),
            headline: "Student | Aspiring Professional",
            about: "Write something about yourself.",
            education: "",
            skills: [],
            contact: "",
            createdAt: new Date()
        };

        const result = await db.collection("users")
            .insertOne(newUser);

        const sessionId = crypto.randomBytes(32).toString("hex");

        sessions.set(sessionId, result.insertedId.toString());

        return sendJson(res, 201, {
            message: "Registration successful!",
            user: safeUser({
                ...newUser,
                _id: result.insertedId
            })
        }, {
            "Set-Cookie": `myfolio_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/`
        });
    }

    // LOGIN
    if (route === "/api/login" && method === "POST") {

        const data = await readBody(req);

        const email = clean(data.email).toLowerCase();
        const password = String(data.password || "");

        const user = await db.collection("users")
            .findOne({ email });

        if (!user || !verifyPassword(password, user.password)) {
            return sendJson(res, 401, {
                message: "Incorrect email or password."
            });
        }

        const sessionId = crypto.randomBytes(32).toString("hex");

        sessions.set(sessionId, user._id.toString());

        return sendJson(res, 200, {
            message: "Login successful!",
            user: safeUser(user)
        }, {
            "Set-Cookie": `myfolio_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/`
        });
    }

    // LOGOUT
    if (route === "/api/logout" && method === "POST") {

        const sessionId = req.headers.cookie
            ?.match(/myfolio_session=([^;]+)/)?.[1];

        if (sessionId) {
            sessions.delete(sessionId);
        }

        return sendJson(res, 200, {
            message: "Logged out successfully."
        }, {
            "Set-Cookie": "myfolio_session=; HttpOnly; Path=/; Max-Age=0"
        });
    }

    // CHECK LOGIN
    const userId = getSession(req);

    if (!userId) {
        return sendJson(res, 401, {
            message: "Please login first."
        });
    }

    const user = await db.collection("users")
        .findOne({ _id: new ObjectId(userId) });

    if (!user) {
        return sendJson(res, 401, {
            message: "User not found."
        });
    }

    // GET PROFILE
    if (route === "/api/me" && method === "GET") {

        return sendJson(res, 200, {
            user: safeUser(user)
        });
    }

    // UPDATE PROFILE
    if (route === "/api/profile" && method === "PUT") {

        const data = await readBody(req);

        const updated = {
            name: clean(data.name),
            headline: clean(data.headline),
            about: clean(data.about),
            education: clean(data.education),
            skills: Array.isArray(data.skills)
                ? data.skills.map(clean).filter(Boolean)
                : [],
            contact: clean(data.contact)
        };

        if (!updated.name) {
            return sendJson(res, 400, {
                message: "Name is required."
            });
        }

        await db.collection("users").updateOne(
            { _id: user._id },
            { $set: updated }
        );

        const updatedUser = await db.collection("users")
            .findOne({ _id: user._id });

        return sendJson(res, 200, {
            message: "Profile updated.",
            user: safeUser(updatedUser)
        });
    }

    // GET ALL PROJECTS
    if (route === "/api/projects" && method === "GET") {

        const projects = await db.collection("projects")
            .find({ userId: user._id.toString() })
            .sort({ createdAt: -1 })
            .toArray();

        return sendJson(res, 200, {
            projects: projects.map(project => ({
                id: project._id.toString(),
                title: project.title,
                description: project.description,
                technology: project.technology,
                link: project.link
            }))
        });
    }

    // ADD PROJECT
    if (route === "/api/projects" && method === "POST") {

        const data = await readBody(req);

        const project = {
            userId: user._id.toString(),
            title: clean(data.title),
            description: clean(data.description),
            technology: clean(data.technology),
            link: clean(data.link),
            createdAt: new Date()
        };

        if (!project.title || !project.description) {
            return sendJson(res, 400, {
                message: "Title and description are required."
            });
        }

        await db.collection("projects").insertOne(project);

        return sendJson(res, 201, {
            message: "Project added successfully."
        });
    }

    // EDIT PROJECT
    if (route.startsWith("/api/projects/") && method === "PUT") {

        const id = route.split("/")[3];

        if (!ObjectId.isValid(id)) {
            return sendJson(res, 400, {
                message: "Invalid project ID."
            });
        }

        const data = await readBody(req);

        const updated = {
            title: clean(data.title),
            description: clean(data.description),
            technology: clean(data.technology),
            link: clean(data.link)
        };

        const result = await db.collection("projects").updateOne(
            {
                _id: new ObjectId(id),
                userId: user._id.toString()
            },
            { $set: updated }
        );

        if (!result.matchedCount) {
            return sendJson(res, 404, {
                message: "Project not found."
            });
        }

        return sendJson(res, 200, {
            message: "Project updated."
        });
    }

    // DELETE PROJECT
    if (route.startsWith("/api/projects/") && method === "DELETE") {

        const id = route.split("/")[3];

        if (!ObjectId.isValid(id)) {
            return sendJson(res, 400, {
                message: "Invalid project ID."
            });
        }

        const result = await db.collection("projects").deleteOne({
            _id: new ObjectId(id),
            userId: user._id.toString()
        });

        if (!result.deletedCount) {
            return sendJson(res, 404, {
                message: "Project not found."
            });
        }

        return sendJson(res, 200, {
            message: "Project deleted."
        });
    }

    return sendJson(res, 404, {
        message: "API not found."
    });
}

// Serve HTML, CSS and JavaScript files
function serveWebsite(req, res, url) {

    let filePath = url.pathname === "/"
        ? "/index.html"
        : decodeURIComponent(url.pathname);

    const publicFolder = path.join(__dirname, "public");

    const fullPath = path.join(publicFolder, filePath);

    if (!fullPath.startsWith(publicFolder)) {
        res.writeHead(403);
        return res.end("Forbidden");
    }

    fs.readFile(fullPath, (error, content) => {

        if (error) {
            res.writeHead(404);
            return res.end("File not found.");
        }

        const extension = path.extname(fullPath);

        const types = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript"
        };

        res.writeHead(200, {
            "Content-Type": types[extension] || "text/plain"
        });

        res.end(content);
    });
}

// Start server and connect database
async function startServer() {

    try {

        await client.connect();

        db = client.db("myfolio");

        await db.collection("users").createIndex(
            { email: 1 },
            { unique: true }
        );

        console.log("MongoDB connected successfully!");

        const server = http.createServer(async (req, res) => {

            const url = new URL(
                req.url,
                `http://${req.headers.host || "localhost"}`
            );

            try {

                if (url.pathname.startsWith("/api/")) {
                    await handleAPI(req, res, url);
                } else {
                    serveWebsite(req, res, url);
                }

            } catch (error) {

                console.log(error);

                if (!res.headersSent) {
                    sendJson(res, 500, {
                        message: "Server error."
                    });
                }
            }
        });

        server.listen(PORT, () => {
            console.log(`MyFolio running at http://localhost:${PORT}`);
        });

    } catch (error) {

        console.log("MongoDB connection failed!");
        console.log(error.message);

    }
}

startServer();