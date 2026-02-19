import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/services/supabase/server';

function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { supplierId, customMessage } = await request.json();

    if (!supplierId) {
      return NextResponse.json(
        { error: 'supplierId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar fornecedor
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: 'Fornecedor não encontrado' },
        { status: 404 }
      );
    }

    if (!supplier.whatsapp) {
      return NextResponse.json(
        { error: 'Fornecedor não possui WhatsApp cadastrado' },
        { status: 400 }
      );
    }

    // Buscar itens vinculados
    const { data: supplierItems, error: itemsError } = await supabase
      .from('supplier_items')
      .select('*, purchase_item:purchase_items(name, unit)')
      .eq('supplier_id', supplierId);

    if (itemsError) {
      return NextResponse.json(
        { error: `Erro ao buscar itens: ${itemsError.message}` },
        { status: 500 }
      );
    }

    if (!supplierItems || supplierItems.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum item vinculado a este fornecedor' },
        { status: 400 }
      );
    }

    // Buscar nome da empresa (tenant)
    let companyName = 'nossa empresa';
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.tenant_id)
        .single();

      if (tenant) companyName = tenant.name;
    }

    // Montar mensagem
    const itemList = supplierItems
      .map((si, i) => {
        const item = si.purchase_item as { name: string; unit: string } | null;
        return `${i + 1}. ${item?.name ?? 'Item'} (${item?.unit ?? 'un'})`;
      })
      .join('\n');

    const message = customMessage
      ? customMessage
      : `Olá! Somos a ${companyName}. Gostaríamos de cotação para:\n\n${itemList}\n\nPor favor, envie os preços unitários atualizados. Obrigado!`;

    // Enviar via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE;

    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      return NextResponse.json(
        { error: 'Evolution API não configurada. Verifique as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${evolutionUrl}/message/sendText/${evolutionInstance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          number: normalizePhoneNumber(supplier.whatsapp),
          text: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Erro na Evolution API: ${errorData}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
