import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing NEON_DATABASE_URL environment variable');
}

const sql = neon(connectionString);

// Keep alive function to prevent database from sleeping
async function keepAlive() {
  try {
    await sql`SELECT 1`;
    console.log('Keep-alive ping sent at', new Date().toISOString());
  } catch (error) {
    console.error('Keep-alive failed:', error);
  }
}

// Ping every 60 seconds to keep connection alive
setInterval(keepAlive, 60000);

const getId = (req: any): number | null => {
  const rawId = req.query?.id ?? req.body?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const numericId = Number(id);
  return Number.isInteger(numericId) ? numericId : null;
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const start = Date.now();
      
      const norms = await sql`
        SELECT id, description, unit, basis_quantity, type, ref_ss 
        FROM norms 
        ORDER BY id DESC
        LIMIT 100
      `;
      
      console.log(`Fetched ${norms.length} norms in ${Date.now() - start}ms`);
      
      if (norms.length === 0) {
        return res.status(200).json([]);
      }
      
      const normIds = norms.map((n: any) => n.id);
      
      const resources = await sql`
        SELECT id, norm_id, name, quantity, unit, resource_type, is_percentage, percentage_base
        FROM norm_resources 
        WHERE norm_id = ANY(${normIds})
      `;
      
      console.log(`Fetched ${resources.length} resources in ${Date.now() - start}ms`);
      
      const resourcesByNorm: Record<number, any[]> = {};
      for (const r of resources) {
        if (!resourcesByNorm[r.norm_id]) {
          resourcesByNorm[r.norm_id] = [];
        }
        resourcesByNorm[r.norm_id].push(r);
      }
      
      const result = norms.map((norm: any) => ({
        ...norm,
        resources: resourcesByNorm[norm.id] || []
      }));
      
      console.log(`Total response time: ${Date.now() - start}ms`);
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const { description, unit, basis_quantity, type, ref_ss, resources } = req.body;
      const [newNorm] = await sql`
        INSERT INTO norms (description, unit, basis_quantity, type, ref_ss) 
        VALUES (${description}, ${unit}, ${basis_quantity}, ${type}, ${ref_ss}) 
        RETURNING id`;

      if (resources && resources.length > 0) {
        for (const r of resources) {
          await sql`
            INSERT INTO norm_resources (norm_id, name, quantity, unit, resource_type, is_percentage, percentage_base)
            VALUES (${newNorm.id}, ${r.name}, ${r.quantity}, ${r.unit}, ${r.resource_type}, ${r.is_percentage}, ${r.percentage_base})`;
        }
      }
      return res.status(201).json({ success: true });
    }

    if (req.method === 'PUT') {
      const id = getId(req);
      if (id === null) {
        return res.status(400).json({ error: 'Missing or invalid id' });
      }

      const { description, unit, basis_quantity, type, ref_ss, resources } = req.body;
      await sql`
        UPDATE norms
        SET description = ${description}, unit = ${unit}, basis_quantity = ${basis_quantity}, type = ${type}, ref_ss = ${ref_ss}
        WHERE id = ${id}`;

      await sql`
        DELETE FROM norm_resources WHERE norm_id = ${id}`;

      if (resources && resources.length > 0) {
        for (const r of resources) {
          await sql`
            INSERT INTO norm_resources (norm_id, name, quantity, unit, resource_type, is_percentage, percentage_base)
            VALUES (${id}, ${r.name}, ${r.quantity}, ${r.unit}, ${r.resource_type}, ${r.is_percentage}, ${r.percentage_base})`;
        }
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const id = getId(req);
      if (id === null) {
        return res.status(400).json({ error: 'Missing or invalid id' });
      }

      await sql`
        DELETE FROM norm_resources WHERE norm_id = ${id}`;
      await sql`
        DELETE FROM norms WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error("DATABASE ERROR:", error);
    return res.status(500).json({ 
      error: 'Database Error', 
      message: error.message 
    });
  }
}