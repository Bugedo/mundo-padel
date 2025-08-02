import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateAdminUser } from '@/lib/authUtils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: Request) {
  // Add admin validation
  const { isAdmin, error: authError } = await validateAdminUser();

  if (!isAdmin) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  const query = supabaseAdmin
    .from('bookings')
    .select('*, user:profiles!bookings_user_id_fkey(full_name)')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (date) query.eq('date', date);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, field, value } = body;

    // Validate allowed fields for updates
    const allowedFields = ['confirmed', 'present', 'cancelled'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Invalid field for update' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ [field]: value })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
