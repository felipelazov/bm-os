import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/services/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ name: null }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ name: null });
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single();

    return NextResponse.json({ name: tenant?.name ?? null });
  } catch {
    return NextResponse.json({ name: null }, { status: 500 });
  }
}
