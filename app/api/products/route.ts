import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET() {
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

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
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

  try {
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const category = formData.get('category') as string;
    const image = formData.get('image') as File;

    if (!name || isNaN(price) || !category || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fileName = `${Date.now()}-${image.name}`;

    const arrayBuffer = await image.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: image.type,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert([{ name, description, price, category, image_url: imageUrl }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
