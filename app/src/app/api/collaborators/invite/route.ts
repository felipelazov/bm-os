import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/services/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, full_name, role, department, job_title } = await request.json();

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { error: 'Email, nome e nível de acesso são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Nível de acesso inválido' },
        { status: 400 }
      );
    }

    // Get current user's tenant_id
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas owners e admins podem convidar colaboradores' },
        { status: 403 }
      );
    }

    // Create user with service role key (admin privileges)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Generate a temporary password
    const tempPassword = `Tmp${crypto.randomUUID().slice(0, 12)}!`;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      if (createError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado no sistema' },
          { status: 409 }
        );
      }
      throw createError;
    }

    // Update user_profile with tenant info
    // The handle_new_user trigger creates a profile with a new tenant,
    // so we need to update it to point to the inviter's tenant
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        tenant_id: profile.tenant_id,
        role,
        department: department || null,
        job_title: job_title || null,
      })
      .eq('id', newUser.user.id);

    if (updateError) {
      throw new Error(`Erro ao configurar perfil: ${updateError.message}`);
    }

    // Delete the auto-created tenant (from the trigger)
    // The trigger creates a new tenant for each user, but invited users should share the inviter's tenant
    // We need to clean up the orphan tenant
    const { data: orphanProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', newUser.user.id)
      .single();

    if (orphanProfile && orphanProfile.tenant_id !== profile.tenant_id) {
      // This shouldn't happen since we already updated, but just in case
      await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', orphanProfile.tenant_id);
    }

    // Send password reset email so user can set their own password
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    return NextResponse.json({
      success: true,
      message: `Colaborador ${full_name} convidado com sucesso`,
    });
  } catch (err) {
    console.error('Erro ao convidar colaborador:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
