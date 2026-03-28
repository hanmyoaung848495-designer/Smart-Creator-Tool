import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ error: "ID and Password are required" });
  }

  console.log(`Attempting login for ID: ${id}`);

  let i = 1;
  let foundKey = null;

  while (true) {
    const envId = process.env[`SYSTEM_KEY_${i}_ID`];
    const envPass = process.env[`SYSTEM_KEY_${i}_PASS`];
    const envValue = process.env[`SYSTEM_KEY_${i}_VALUE`];

    if (!envId) break;

    console.log(`Checking key ${i}: EnvId=${envId}, EnvPass=${envPass ? '***' : 'missing'}`);

    if (envId === id && envPass === password) {
      console.log(`Login successful for ID: ${id}`);
      foundKey = envValue;
      break;
    }
    i++;
  }

  if (foundKey) {
    return res.json({ apiKey: foundKey });
  } else {
    console.log(`Login failed for ID: ${id}`);
    return res.status(401).json({ error: "Invalid ID or Password" });
  }
}
