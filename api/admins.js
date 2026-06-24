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

  // POST - login admin
  if (req.method === 'POST' && req.query.action === 'login') {
    const { username, password } = req.body;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*, locations(*)')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    return res.status(200).json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        is_super: admin.is_super,
        location: admin.locations
      }
    });
  }

  // GET - liste tous les admins (super admin seulement)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, is_super, created_at, locations(name)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST - créer un admin local
  if (req.method === 'POST') {
    const { username, password, location_id } = req.body;

    if (!username || !password || !location_id) {
      return res.status(400).json({ error: 'Username, password et location requis' });
    }

    const { data, error } = await supabase
      .from('admins')
      .insert({ username, password, location_id, is_super: false })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // DELETE - supprimer un admin
  if (req.method === 'DELETE') {
    const { id } = req.body;

    if (!id) return res.status(400).json({ error: 'ID requis' });

    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
