import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export default async function handler(req, res) {
  try {
    // Ping Supabase pour eviter la mise en pause
    const { data, error } = await supabase
      .from('locations')
      .select('id')
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Supabase is alive',
      time: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
