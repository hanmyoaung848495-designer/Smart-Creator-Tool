class SupabaseProxyBuilder {
  private table: string;
  private chain: Array<{ method: string; args: any[] }> = [];

  constructor(table: string) {
    this.table = table;
  }

  select(...args: any[]) {
    this.chain.push({ method: 'select', args });
    return this;
  }

  insert(...args: any[]) {
    this.chain.push({ method: 'insert', args });
    return this;
  }

  update(...args: any[]) {
    this.chain.push({ method: 'update', args });
    return this;
  }

  upsert(...args: any[]) {
    this.chain.push({ method: 'upsert', args });
    return this;
  }

  delete(...args: any[]) {
    this.chain.push({ method: 'delete', args });
    return this;
  }

  eq(...args: any[]) {
    this.chain.push({ method: 'eq', args });
    return this;
  }

  neq(...args: any[]) {
    this.chain.push({ method: 'neq', args });
    return this;
  }

  single(...args: any[]) {
    this.chain.push({ method: 'single', args });
    return this;
  }

  maybeSingle(...args: any[]) {
    this.chain.push({ method: 'maybeSingle', args });
    return this;
  }

  order(...args: any[]) {
    this.chain.push({ method: 'order', args });
    return this;
  }

  limit(...args: any[]) {
    this.chain.push({ method: 'limit', args });
    return this;
  }

  // To support thenable/await
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any): Promise<any> {
    try {
      const response = await fetch('/api/db-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table: this.table,
          chain: this.chain
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to execute query proxy');
      }
      const data = await response.json();
      return onfulfilled ? onfulfilled(data) : data;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }
}

export const supabase = {
  from(table: string) {
    return new SupabaseProxyBuilder(table);
  }
} as any;
