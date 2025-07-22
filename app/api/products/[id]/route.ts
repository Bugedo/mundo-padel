import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

  const productId = params.id;
  const formData = await req.formData();

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const category = formData.get('category') as string;
  const newImage = formData.get('image') as File | null;

  // Fetch existing product
  const { data: existingProduct, error: fetchError } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .single();

  if (fetchError || !existingProduct) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  let imageUrl = existingProduct.image_url;

  // If new image provided, upload and delete old
  if (newImage) {
    const oldFileName = imageUrl.split('/').pop();
    await supabase.storage.from('product-images').remove([oldFileName!]);

    const newFileName = `${Date.now()}-${newImage.name}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(newFileName, newImage.stream(), {
        contentType: newImage.type,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(newFileName);

    imageUrl = publicUrlData.publicUrl;
  }

  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update({ name, description, price, category, image_url: imageUrl })
    .eq('id', productId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedProduct);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
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

  const productId = params.id;

  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const fileName = product.image_url.split('/').pop();

  const { error: deleteError } = await supabase.from('products').delete().eq('id', productId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await supabase.storage.from('product-images').remove([fileName!]);

  return NextResponse.json({ message: 'Product and image deleted successfully' });
}
