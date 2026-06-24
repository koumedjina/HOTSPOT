import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - liste toutes les locations
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST - créer une nouvelle location
  if (req.method === 'POST') {
    const { name, address, owner_name } = req.body;

    if (!name) return res.status(400).json({ error: 'Nom requis' });

    const { data, error } = await supabase
      .from('locations')
      .insert({ name, address, owner_name })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // DELETE - supprimer une location
  if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id) return res.status(400).json({ error: 'ID requis' });

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
