import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/services/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { collaboratorId } = await request.json();

    if (!collaboratorId) {
      return NextResponse.json(
        { error: 'ID do colaborador é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar autenticação e permissão
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
        { error: 'Apenas owners e admins podem excluir colaboradores' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verificar se o colaborador pertence ao mesmo tenant
    const { data: target } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('id', collaboratorId)
      .single();

    if (!target || target.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 });
    }

    if (target.role === 'owner') {
      return NextResponse.json(
        { error: 'Não é possível excluir o proprietário da conta' },
        { status: 403 }
      );
    }

    // Desvincular entregas atribuídas a este motorista
    await supabaseAdmin
      .from('deliveries')
      .update({ driver_id: null })
      .eq('driver_id', collaboratorId);

    // Excluir perfil (collaborator_documents é CASCADE)
    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', collaboratorId);

    if (deleteProfileError) {
      throw new Error(`Erro ao excluir perfil: ${deleteProfileError.message}`);
    }

    // Excluir usuário do auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(collaboratorId);

    if (deleteAuthError) {
      console.error('Erro ao excluir auth user (perfil já removido):', deleteAuthError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir colaborador:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
