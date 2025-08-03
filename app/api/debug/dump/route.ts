import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for full database access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    console.log('Starting database dump...');

    // Test basic connection by accessing profiles table
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('Error accessing profiles:', profilesError);
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: profilesError.message,
        },
        { status: 500 },
      );
    }

    console.log('Profiles table accessible');

    // Test bookings table
    const { data: bookingsData, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .limit(5);

    if (bookingsError) {
      console.error('Error accessing bookings:', bookingsError);
    }

    // Return what we can access
    const databaseDump: any = {
      profiles: {
        structure: 'Available',
        data: profilesData || [],
        rowCount: profilesData?.length || 0,
        hasError: false,
      },
    };

    if (!bookingsError) {
      databaseDump.bookings = {
        structure: 'Available',
        data: bookingsData || [],
        rowCount: bookingsData?.length || 0,
        hasError: false,
      };
    }

    return NextResponse.json({
      success: true,
      databaseDump,
      summary: {
        totalTables: Object.keys(databaseDump).length,
        tables: Object.keys(databaseDump),
        timestamp: new Date().toISOString(),
        note: 'Basic access - testing known tables',
      },
    });
  } catch (error) {
    console.error('Database dump endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating database dump', details: String(error) },
      { status: 500 },
    );
  }
}
