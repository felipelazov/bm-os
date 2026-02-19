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

    const { documentId, phoneNumber, message } = await request.json();

    if (!documentId || !phoneNumber) {
      return NextResponse.json(
        { error: 'documentId e phoneNumber são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar documento
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      );
    }

    // Gerar signed URL (5 min)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 300);

    if (signedError || !signedData) {
      return NextResponse.json(
        { error: 'Erro ao gerar URL do arquivo' },
        { status: 500 }
      );
    }

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
      `${evolutionUrl}/message/sendMedia/${evolutionInstance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          number: normalizePhoneNumber(phoneNumber),
          mediatype: 'document',
          media: signedData.signedUrl,
          fileName: doc.name,
          caption: message || '',
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

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
