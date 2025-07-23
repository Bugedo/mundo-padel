import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at');

  if (error) {
    return NextResponse.json(
      { error: 'Error fetching profiles: ' + error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? []);
}

// PATH
export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json();

    if (!id || !updates) {
      return NextResponse.json(
        { error: 'Missing id or updates in request body.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, email, role, updated_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Error updating profile: ' + error.message },
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
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id in request body.' }, { status: 400 });
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Error deleting profile: ' + error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Profile deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
  }
}
