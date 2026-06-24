import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { mac } = req.query;

  if (!mac) {
    return res.status(400).json({ error: 'MAC requis' });
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('mac_address', mac)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !session) {
    return res.status(404).json({ active: false });
  }

  return res.status(200).json({
    active: true,
    expires_at: session.expires_at
  });
}
