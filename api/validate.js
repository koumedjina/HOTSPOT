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

  const { code, mac, ip, location_id } = req.body;

  if (!code || !mac) {
    return res.status(400).json({ error: 'Code et MAC requis' });
  }

  // Chercher le voucher
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !voucher) {
    return res.status(404).json({ error: 'Code invalide ou expire' });
  }

  // Verifier que le voucher appartient au bon endroit
  if (voucher.location_id && location_id) {
    if (voucher.location_id !== location_id) {
      return res.status(403).json({ error: 'Ce code nest pas valide sur ce reseau' });
    }
  }

  // Verifier le nombre d'utilisations
  if (voucher.used_count >= voucher.max_uses) {
    return res.status(403).json({ error: 'Code deja utilise au maximum' });
  }

  // Verifier la date d'expiration du voucher
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return res.status(403).json({ error: 'Code expire' });
  }

  // Verifier si ce MAC a deja une session active
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('*')
    .eq('mac_address', mac)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (existingSession) {
    return res.status(200).json({
      success: true,
      expires_at: existingSession.expires_at,
      duration_h: voucher.duration_h,
      message: 'Session deja active'
    });
  }

  // Calculer la date d'expiration de la session
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + voucher.duration_h);

  // Creer la session
  await supabase.from('sessions').insert({
    mac_address: mac,
    ip_address: ip || '',
    voucher_id: voucher.id,
    location_id: voucher.location_id || location_id || null,
    expires_at: expiresAt.toISOString(),
    is_active: true
  });

  // Incrementer le compteur d'utilisations
  await supabase
    .from('vouchers')
    .update({ used_count: voucher.used_count + 1 })
    .eq('id', voucher.id);

  // Enregistrer dans les logs
  await supabase.from('logs').insert({
    mac_address: mac,
    action: 'login',
    ip_address: ip || '',
    location_id: voucher.location_id || location_id || null
  }).catch(() => {});

  return res.status(200).json({
    success: true,
    expires_at: expiresAt.toISOString(),
    duration_h: voucher.duration_h
  });
}
