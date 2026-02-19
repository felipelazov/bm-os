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

    const { phoneNumber, pdfBase64, fileName, message } = await request.json();

    if (!phoneNumber || !pdfBase64 || !fileName) {
      return NextResponse.json(
        { error: 'phoneNumber, pdfBase64 e fileName sao obrigatorios' },
        { status: 400 }
      );
    }

    // Decodifica base64 para Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const storagePath = `quotes/${fileName}`;

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Erro ao fazer upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Gerar signed URL (5 min)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 300);

    if (signedError || !signedData) {
      // Limpar arquivo em caso de erro
      await supabase.storage.from('documents').remove([storagePath]);
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
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json(
        { error: 'Evolution API nao configurada. Verifique as variaveis de ambiente.' },
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
          fileName,
          caption: message || '',
        }),
      }
    );

    // Remover arquivo do storage apos envio
    await supabase.storage.from('documents').remove([storagePath]);

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
