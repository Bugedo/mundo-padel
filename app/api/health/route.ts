import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey,
        hasServiceKey: !!supabaseServiceKey,
      }, { status: 500 });
    }

    // Test Supabase connection
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      
      if (error) {
        return NextResponse.json({
          status: 'error',
          message: 'Database connection failed',
          error: error.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        status: 'healthy',
        message: 'All systems operational',
        supabase: 'connected',
        database: 'accessible',
      });
    } catch (dbError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database test failed',
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
