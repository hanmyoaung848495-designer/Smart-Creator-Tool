import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.post("/api/login", (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ error: "ID and Password are required" });
    }

    // Search for matching credentials in environment variables
    // Format: SYSTEM_KEY_1_ID, SYSTEM_KEY_1_PASS, SYSTEM_KEY_1_VALUE
    let i = 1;
    let foundKey = null;

    while (true) {
      const envId = process.env[`SYSTEM_KEY_${i}_ID`];
      const envPass = process.env[`SYSTEM_KEY_${i}_PASS`];
      const envValue = process.env[`SYSTEM_KEY_${i}_VALUE`];

      if (!envId) break; // No more keys defined

      if (envId === id && envPass === password) {
        foundKey = envValue;
        break;
      }
      i++;
    }

    if (foundKey) {
      return res.json({ apiKey: foundKey });
    } else {
      return res.status(401).json({ error: "Invalid ID or Password" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
