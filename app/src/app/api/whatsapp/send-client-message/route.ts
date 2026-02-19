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

const GREETINGS = [
  'Olá', 'Oi', 'Bom dia', 'Boa tarde', 'E aí', 'Tudo bem',
  'Olá!', 'Oi!', 'Hey', 'Saudações',
];

function applyAntiBlock(text: string, index: number): string {
  // Saudação rotativa
  const greeting = GREETINGS[index % GREETINGS.length];
  let modified = text.replace(/^(Olá|Oi|Bom dia|Boa tarde|Hey|E aí|Tudo bem|Saudações)!?/i, greeting);

  // Zero-width spaces em posições variadas para tornar cada mensagem única
  const zwsp = '\u200B';
  const insertPos = (index * 7 + 3) % Math.max(modified.length - 1, 1);
  modified = modified.slice(0, insertPos) + zwsp + modified.slice(insertPos);

  return modified;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { clientIds, customMessage } = await request.json();

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'clientIds é obrigatório (array de IDs)' },
        { status: 400 }
      );
    }

    if (!customMessage) {
      return NextResponse.json(
        { error: 'customMessage é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar clientes
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);

    if (clientsError) {
      return NextResponse.json(
        { error: `Erro ao buscar clientes: ${clientsError.message}` },
        { status: 500 }
      );
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum cliente encontrado' },
        { status: 404 }
      );
    }

    // Evolution API config
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const evolutionInstance = process.env.EVOLUTION_INSTANCE;

    if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
      return NextResponse.json(
        { error: 'Evolution API não configurada. Verifique as variáveis de ambiente.' },
        { status: 500 }
      );
    }

    const errors: string[] = [];
    let sent = 0;

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];

      if (!client.whatsapp) {
        errors.push(`${client.name}: sem WhatsApp`);
        continue;
      }

      // Substituir variável {nome_cliente} e aplicar anti-bloqueio
      let message = customMessage.replace(/\{nome_cliente\}/g, client.name);
      message = applyAntiBlock(message, i);

      try {
        const response = await fetch(
          `${evolutionUrl}/message/sendText/${evolutionInstance}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: evolutionKey,
            },
            body: JSON.stringify({
              number: normalizePhoneNumber(client.whatsapp),
              text: message,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          errors.push(`${client.name}: ${errorData}`);
        } else {
          sent++;
        }
      } catch (err) {
        errors.push(`${client.name}: ${err instanceof Error ? err.message : 'Erro'}`);
      }

      // Delay 3-5s entre envios para evitar bloqueio
      if (i < clients.length - 1) {
        const delay = 3000 + Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      total: clients.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
