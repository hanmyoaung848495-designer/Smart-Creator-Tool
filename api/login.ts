import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Trim inputs to remove any accidental spaces
    const id = req.body.id?.toString().trim();
    const password = req.body.password?.toString().trim();

    if (!id || !password) {
      return res.status(400).json({ error: "ID and Password are required" });
    }

    let i = 1;
    let foundKey = null;
    const debugLog: any[] = [];

    // Check up to 10 keys
    for (i = 1; i <= 10; i++) {
      const envId = process.env[`SYSTEM_KEY_${i}_ID`];
      const envPass = process.env[`SYSTEM_KEY_${i}_PASS`];
      const envValue = process.env[`SYSTEM_KEY_${i}_VALUE`];

      if (!envId) {
        debugLog.push({ index: i, status: "Not defined in Vercel" });
        continue;
      }

      debugLog.push({ 
        index: i, 
        envId: envId, 
        matchId: envId === id, 
        matchPass: envPass === password 
      });

      if (envId === id && envPass === password) {
        foundKey = envValue;
        break;
      }
    }

    if (foundKey) {
      return res.status(200).json({ apiKey: foundKey });
    } else {
      // Using 200 instead of 401 just for debugging to ensure browser shows the JSON
      return res.status(200).json({ 
        error: "Invalid ID or Password",
        debug: debugLog,
        received: { id, password: password ? "***" : "missing" }
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Server Crash", message: error.message });
  }
}
