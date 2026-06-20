import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
export let supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const MOCK_DB_PATH = path.join(process.cwd(), "mock_supabase.json");

function loadMockDb() {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      return JSON.parse(fs.readFileSync(MOCK_DB_PATH, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading mock db:", e);
  }
  return {
    app_settings: [
      {
        key: 'usage_limits',
        value: {
          ai_voice_guest_limit: 2,
          transcribe_guest_limit: 2,
          transcribe_user_limit: 3
        },
        updated_at: new Date().toISOString()
      }
    ],
    tool_usage: [],
    users_accounts: [],
    tutorials: [],
    playlists: [],
    banned_sessions: [],
    analytics: [],
    tts_cache: []
  };
}

function saveMockDb(db: any) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving mock db:", e);
  }
}

export function executeMockQuery(table: string, chain: Array<{ method: string, args: any[] }>) {
  const db = loadMockDb();
  if (!db[table]) {
    db[table] = [];
  }

  let data = db[table];
  let error: any = null;
  let isSingle = false;
  let isMaybeSingle = false;

  const eqSteps = chain.filter(c => c.method === 'eq');
  const neqSteps = chain.filter(c => c.method === 'neq');
  const orderStep = chain.find(c => c.method === 'order');
  const limitStep = chain.find(c => c.method === 'limit');
  
  const insertStep = chain.find(c => c.method === 'insert');
  const updateStep = chain.find(c => c.method === 'update');
  const upsertStep = chain.find(c => c.method === 'upsert');
  const deleteStep = chain.find(c => c.method === 'delete');
  
  isSingle = chain.some(c => c.method === 'single');
  isMaybeSingle = chain.some(c => c.method === 'maybeSingle');

  if (insertStep) {
    const rows = Array.isArray(insertStep.args[0]) ? insertStep.args[0] : [insertStep.args[0]];
    const newRows = rows.map((r: any) => {
      const newId = db[table].length > 0 ? Math.max(...db[table].map((x: any) => x.id || 0)) + 1 : 1;
      return { id: newId, created_at: Date.now(), ...r };
    });
    db[table].push(...newRows);
    saveMockDb(db);
    data = newRows;
  } else if (upsertStep) {
    const rows = Array.isArray(upsertStep.args[0]) ? upsertStep.args[0] : [upsertStep.args[0]];
    const options = upsertStep.args[1] || {};
    const onConflict = options.onConflict || 'id';
    const conflictKeys = onConflict.split(',').map((k: string) => k.trim());
    
    const upsertedRows: any[] = [];
    for (const r of rows) {
      const idx = db[table].findIndex((existing: any) => {
        return conflictKeys.every((key: string) => existing[key] === r[key]);
      });
      if (idx !== -1) {
        db[table][idx] = { ...db[table][idx], ...r, updated_at: new Date().toISOString() };
        upsertedRows.push(db[table][idx]);
      } else {
        const newId = db[table].length > 0 ? Math.max(...db[table].map((x: any) => x.id || 0)) + 1 : 1;
        const newRow = { id: newId, created_at: Date.now(), ...r };
        db[table].push(newRow);
        upsertedRows.push(newRow);
      }
    }
    saveMockDb(db);
    data = upsertedRows;
  } else if (updateStep) {
    const fields = updateStep.args[0] || {};
    let filteredIndices: number[] = [];
    db[table].forEach((item: any, idx: number) => {
      let matches = true;
      for (const eq of eqSteps) {
        if (item[eq.args[0]] !== eq.args[1]) matches = false;
      }
      for (const neq of neqSteps) {
        if (item[neq.args[0]] === neq.args[1]) matches = false;
      }
      if (matches) filteredIndices.push(idx);
    });

    for (const idx of filteredIndices) {
      db[table][idx] = { ...db[table][idx], ...fields, updated_at: new Date().toISOString() };
    }
    saveMockDb(db);
    data = filteredIndices.map(idx => db[table][idx]);
  } else if (deleteStep) {
    const originalLength = db[table].length;
    const remaining = db[table].filter((item: any) => {
      let matches = true;
      for (const eq of eqSteps) {
        if (item[eq.args[0]] !== eq.args[1]) matches = false;
      }
      for (const neq of neqSteps) {
        if (item[neq.args[0]] === neq.args[1]) matches = false;
      }
      return !matches;
    });
    db[table] = remaining;
    saveMockDb(db);
    data = [];
  } else {
    // Select
    for (const eq of eqSteps) {
      const field = eq.args[0];
      const val = eq.args[1];
      data = data.filter((item: any) => item[field] === val);
    }
    for (const neq of neqSteps) {
      const field = neq.args[0];
      const val = neq.args[1];
      data = data.filter((item: any) => item[field] !== val);
    }
    if (orderStep) {
      const field = orderStep.args[0];
      const options = orderStep.args[1] || {};
      const ascending = options.ascending !== false;
      data.sort((a: any, b: any) => {
        if (a[field] < b[field]) return ascending ? -1 : 1;
        if (a[field] > b[field]) return ascending ? 1 : -1;
        return 0;
      });
    }
    if (limitStep) {
      const limitVal = Number(limitStep.args[0]);
      if (!isNaN(limitVal)) {
        data = data.slice(0, limitVal);
      }
    }
  }

  // Handle single / maybeSingle output structure
  if (isSingle) {
    if (data.length === 0) {
      error = { message: "No rows found", code: "PGRST116" };
      data = null;
    } else {
      data = data[0];
    }
  } else if (isMaybeSingle) {
    data = data.length > 0 ? data[0] : null;
  }

  return { data, error, count: Array.isArray(data) ? data.length : (data ? 1 : 0) };
}

class MockSupabaseQueryBuilder {
  private table: string;
  private chain: Array<{ method: string; args: any[] }> = [];

  constructor(table: string) {
    this.table = table;
  }

  select(...args: any[]) { this.chain.push({ method: 'select', args }); return this; }
  insert(...args: any[]) { this.chain.push({ method: 'insert', args }); return this; }
  update(...args: any[]) { this.chain.push({ method: 'update', args }); return this; }
  upsert(...args: any[]) { this.chain.push({ method: 'upsert', args }); return this; }
  delete(...args: any[]) { this.chain.push({ method: 'delete', args }); return this; }
  eq(...args: any[]) { this.chain.push({ method: 'eq', args }); return this; }
  neq(...args: any[]) { this.chain.push({ method: 'neq', args }); return this; }
  single(...args: any[]) { this.chain.push({ method: 'single', args }); return this; }
  maybeSingle(...args: any[]) { this.chain.push({ method: 'maybeSingle', args }); return this; }
  order(...args: any[]) { this.chain.push({ method: 'order', args }); return this; }
  limit(...args: any[]) { this.chain.push({ method: 'limit', args }); return this; }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = executeMockQuery(this.table, this.chain);
      return onfulfilled ? onfulfilled(result) : result;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

export const mockSupabase = {
  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  }
} as any;

if (!supabase) {
  console.log("Supabase not configured. Using local JSON-file-based persistent fallback.");
  supabase = mockSupabase;
}
