import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, mac, ip } = req.body;

  if (!code || !mac) {
    return res.status(400).json({ error: 'Code et MAC requis' });
  }

  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !voucher) {
    return res.status(404).json({ error: 'Code invalide ou expiré' });
  }

  if (voucher.used_count >= voucher.max_uses) {
    return res.status(403).json({ error: 'Code déjà utilisé au maximum' });
  }

  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return res.status(403).json({ error: 'Code expiré' });
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + voucher.duration_h);

  await supabase.from('sessions').insert({
    mac_address: mac,
    ip_address: ip || '',
    voucher_id: voucher.id,
    expires_at: expiresAt.toISOString(),
    is_active: true
  });

  await supabase
    .from('vouchers')
    .update({ used_count: voucher.used_count + 1 })
    .eq('id', voucher.id);

  return res.status(200).json({
    success: true,
    expires_at: expiresAt.toISOString(),
    duration_h: voucher.duration_h
  });
}
