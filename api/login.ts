import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
  }

  let i = 1;
  let foundKey = null;

  // Debugging: Check if process.env is accessible
  const envKeys = Object.keys(process.env).filter(key => key.startsWith('SYSTEM_KEY_'));

  while (true) {
    const envId = process.env[`SYSTEM_KEY_${i}_ID`];
    const envPass = process.env[`SYSTEM_KEY_${i}_PASS`];
    const envValue = process.env[`SYSTEM_KEY_${i}_VALUE`];

    if (!envId) break;

    if (envId === id && envPass === password) {
      foundKey = envValue;
      break;
    }
    i++;
  }

  if (foundKey) {
    return res.json({ apiKey: foundKey });
  } else {
    // Return more info to debug (only for debugging, remove later)
    return res.status(401).json({ 
      error: "Invalid ID or Password",
      debug: {
        receivedId: id,
        foundKeysCount: i - 1,
        availableEnvKeys: envKeys
      }
    });
  }
}
