import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: async () => {} } },
  );

  const userId = params.id;

  // Fetch orders for this user
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      total_price,
      status,
      created_at,
      order_items (
        id,
        quantity,
        price,
        product:product_id (id, name, image_url)
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(orders ?? []);
}
