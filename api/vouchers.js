import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function generateCode(prefix = '') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix ? prefix + '-' : '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - liste tous les vouchers
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST - créer un ou plusieurs vouchers
  if (req.method === 'POST') {
    const { code, duration_h, max_uses, location_id, quantity, prefix } = req.body;

    // Génération en masse
    if (quantity && quantity > 1) {
      const vouchers = [];
      const usedCodes = new Set();

      for (let i = 0; i < quantity; i++) {
        let newCode;
        do {
          newCode = generateCode(prefix || '');
        } while (usedCodes.has(newCode));
        usedCodes.add(newCode);

        vouchers.push({
          code: newCode,
          duration_h: duration_h || 1,
          max_uses: max_uses || 1,
          location_id: location_id || null
        });
      }

      const { data, error } = await supabase
        .from('vouchers')
        .insert(vouchers)
        .select();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ success: true, count: data.length, vouchers: data });
    }

    // Création simple
    if (!code) return res.status(400).json({ error: 'Code requis' });

    const { data, error } = await supabase
      .from('vouchers')
      .insert({ code, duration_h, max_uses, location_id })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // PUT - bloquer ou activer un voucher
  if (req.method === 'PUT') {
    const { id, is_active } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });

    const { error } = await supabase
      .from('vouchers')
      .update({ is_active })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // DELETE - supprimer un voucher
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requis' });

    const { error } = await supabase
      .from('vouchers')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
