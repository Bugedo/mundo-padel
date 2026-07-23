import { NextResponse } from 'next/server';
import { validateAdminUser } from '@/lib/authUtils';
import {
  formatPhoneDisplay,
  normalizeArgentinePhone,
  supabaseAdmin,
} from '@/lib/bookingUtils';

export async function GET(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (q && q.length < 2) {
      return NextResponse.json([]);
    }

    if (q.length >= 2) {
      // Fetch a broader set and filter in JS for reliable multi-field search
      const { data: all, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .order('full_name', { ascending: true })
        .limit(500);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const needle = q.toLowerCase();
      const filtered = (all || [])
        .filter((c) => {
          const name = (c.full_name || '').toLowerCase();
          const email = (c.email || '').toLowerCase();
          const phone = (c.phone || '').toLowerCase();
          return name.includes(needle) || email.includes(needle) || phone.includes(needle);
        })
        .slice(0, 20);

      return NextResponse.json(filtered);
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .order('full_name', { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('GET clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const full_name = String(body.full_name || '').trim();
    let phone = body.phone ? String(body.phone).trim() : null;
    const email = body.email ? String(body.email).trim().toLowerCase() : null;

    if (!full_name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    if (phone) {
      const normalized = normalizeArgentinePhone(phone);
      phone = normalized ? formatPhoneDisplay(normalized) : phone;
    }

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({ full_name, phone, email })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('POST clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing id or updates' }, { status: 400 });
    }

    const safe: Record<string, string | null> = {};
    if (updates.full_name !== undefined) {
      safe.full_name = String(updates.full_name).trim();
      if (!safe.full_name) {
        return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
      }
    }
    if (updates.email !== undefined) {
      safe.email = updates.email ? String(updates.email).trim().toLowerCase() : null;
    }
    if (updates.phone !== undefined) {
      const raw = updates.phone ? String(updates.phone).trim() : null;
      if (raw) {
        const normalized = normalizeArgentinePhone(raw);
        safe.phone = normalized ? formatPhoneDisplay(normalized) : raw;
      } else {
        safe.phone = null;
      }
    }
    safe.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(safe)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { isAdmin, error: authError } = await validateAdminUser();
    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('clients').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE clients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
