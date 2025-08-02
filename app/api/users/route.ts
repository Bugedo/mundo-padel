import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateAdminUser } from '@/lib/authUtils';

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    cookies: {
      getAll: () => [],
      setAll: async () => {},
    },
  },
);

// GET
export async function GET() {
  // Add admin validation
  const { isAdmin, error: authError } = await validateAdminUser();

  if (!isAdmin) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const { data, error: dbError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at');

  if (dbError) {
    return NextResponse.json(
      { error: 'Error fetching profiles: ' + dbError.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}

// PATCH
export async function PATCH(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { id, updates } = await req.json();

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Missing id or updates in request body.' },
        { status: 400 },
      );
    }

    // Validate allowed fields for updates
    const allowedFields = ['full_name', 'email', 'phone', 'role'];
    const safeUpdates = Object.keys(updates).reduce((acc, key) => {
      if (allowedFields.includes(key)) {
        acc[key] = updates[key];
      }
      return acc;
    }, {} as any);

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, full_name, email, role, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Error updating profile: ' + updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}

// DELETE
export async function DELETE(req: Request) {
  try {
    // Add admin validation
    const { isAdmin, error: authError } = await validateAdminUser();

    if (!isAdmin) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id in request body.' }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from('profiles').delete().eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Error deleting profile: ' + deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Profile deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
