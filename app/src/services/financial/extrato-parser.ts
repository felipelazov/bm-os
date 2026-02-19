import * as XLSX from 'xlsx';
import type { ParsedTransaction, TransactionType, ImportFileFormat } from '@/types/financial.types';

// ============================================
// Utilitários compartilhados
// ============================================

function parseDate(dateStr: string, format: string): string {
  const cleaned = dateStr.trim();
  if (format === 'dd/mm/yyyy') {
    const [d, m, y] = cleaned.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (format === 'mm/dd/yyyy') {
    const [m, d, y] = cleaned.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return cleaned; // yyyy-mm-dd
}

function parseValue(valueStr: string): number {
  // Lida com formato brasileiro: 1.234,56 → 1234.56
  let cleaned = valueStr.trim().replace(/[^\d,.\-]/g, '');

  // Detecta formato brasileiro (vírgula como decimal)
  if (cleaned.includes(',') && cleaned.indexOf(',') > cleaned.lastIndexOf('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  }

  return parseFloat(cleaned) || 0;
}

// ============================================
// CSV Parser (com auto-detecção de colunas)
// ============================================

interface CsvParserOptions {
  dateColumn: number;
  descriptionColumn: number;
  valueColumn: number;
  separator: string;
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  hasHeader: boolean;
  encoding: string;
}

const DEFAULT_CSV_OPTIONS: CsvParserOptions = {
  dateColumn: 0,
  descriptionColumn: 1,
  valueColumn: 2,
  separator: ';',
  dateFormat: 'dd/mm/yyyy',
  hasHeader: true,
  encoding: 'utf-8',
};

/**
 * Auto-detecta a linha de header e posição das colunas no CSV.
 * Suporta arquivos como o Inter que têm linhas informativas antes do header de dados.
 */
function autoDetectCsvColumns(
  lines: string[],
  separator: string
): { headerIndex: number; dateCol: number; descCols: number[]; valueCol: number } | null {
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase());

    const dateCol = cols.findIndex((c) => /^(data|date|dt|vencimento)/.test(c));
    const valueCol = cols.findIndex((c) => /^(valor|value|amount|vlr)/.test(c));

    if (dateCol !== -1 && valueCol !== -1) {
      // Encontra todas as colunas de descrição (histórico, descrição, memo, etc.)
      const descCols: number[] = [];
      cols.forEach((c, idx) => {
        if (idx !== dateCol && idx !== valueCol && /^(descri|historico|hist|memo|detalhe|observa)/.test(c)) {
          descCols.push(idx);
        }
      });

      return { headerIndex: i, dateCol, descCols, valueCol };
    }
  }
  return null;
}

export function parseCsv(
  content: string,
  options: Partial<CsvParserOptions> = {}
): ParsedTransaction[] {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  const lines = content.trim().split('\n');

  // Auto-detecção de colunas (para Inter e outros com header não-padrão)
  const detected = autoDetectCsvColumns(lines, opts.separator);
  let startIndex: number;
  let dateCol: number;
  let valueCol: number;
  let descCols: number[];

  if (detected) {
    startIndex = detected.headerIndex + 1;
    dateCol = detected.dateCol;
    valueCol = detected.valueCol;
    descCols = detected.descCols.length > 0 ? detected.descCols : [opts.descriptionColumn];
  } else {
    startIndex = opts.hasHeader ? 1 : 0;
    dateCol = opts.dateColumn;
    valueCol = opts.valueColumn;
    descCols = [opts.descriptionColumn];
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(opts.separator).map((c) => c.trim().replace(/^"|"$/g, ''));

    if (columns.length <= Math.max(dateCol, ...descCols, valueCol)) {
      continue;
    }

    const value = parseValue(columns[valueCol]);
    if (value === 0) continue;

    // Concatena todas as colunas de descrição encontradas
    const description = descCols
      .map((col) => columns[col])
      .filter(Boolean)
      .join(' - ');

    const type: TransactionType = value >= 0 ? 'income' : 'expense';

    transactions.push({
      date: parseDate(columns[dateCol], opts.dateFormat),
      description: description || 'Sem descrição',
      value: Math.abs(value),
      type,
      document_number: null,
      raw_data: line,
    });
  }

  return transactions;
}

// ============================================
// OFX Parser (Open Financial Exchange)
// ============================================

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<\\n]+)`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function parseOfxDate(dateStr: string): string {
  // OFX date format: YYYYMMDDHHMMSS or YYYYMMDD
  const cleaned = dateStr.replace(/\[.*\]/, '').trim();
  const year = cleaned.substring(0, 4);
  const month = cleaned.substring(4, 6);
  const day = cleaned.substring(6, 8);
  return `${year}-${month}-${day}`;
}

export function parseOfx(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Divide por cada transação <STMTTRN>
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)(<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];

    const trnType = extractTag(block, 'TRNTYPE');
    const dtPosted = extractTag(block, 'DTPOSTED');
    const trnAmt = extractTag(block, 'TRNAMT');
    const memo = extractTag(block, 'MEMO') || extractTag(block, 'NAME');
    const fitId = extractTag(block, 'FITID');
    const checkNum = extractTag(block, 'CHECKNUM');

    const value = parseFloat(trnAmt.replace(',', '.')) || 0;
    if (value === 0) continue;

    const type: TransactionType = value >= 0 ? 'income' : 'expense';

    transactions.push({
      date: dtPosted ? parseOfxDate(dtPosted) : '',
      description: memo || trnType,
      value: Math.abs(value),
      type,
      document_number: checkNum || fitId || null,
      raw_data: block.trim(),
    });
  }

  return transactions;
}

// ============================================
// XML Parser (genérico para extratos bancários)
// ============================================

export function parseXml(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Tenta detectar padrões comuns de XML bancário
  // Padrão 1: <lancamento> ou <transaction>
  const patterns = [
    /<(?:lancamento|transaction|movimento|entry)([\s\S]*?)(?:<\/(?:lancamento|transaction|movimento|entry)>)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const block = match[1];

      const date =
        extractTag(block, 'data') ||
        extractTag(block, 'date') ||
        extractTag(block, 'dtMovimento') ||
        extractTag(block, 'dataLancamento');

      const description =
        extractTag(block, 'descricao') ||
        extractTag(block, 'description') ||
        extractTag(block, 'historico') ||
        extractTag(block, 'memo');

      const valueStr =
        extractTag(block, 'valor') ||
        extractTag(block, 'value') ||
        extractTag(block, 'amount');

      const value = parseValue(valueStr);
      if (value === 0 || !date) continue;

      const type: TransactionType = value >= 0 ? 'income' : 'expense';

      transactions.push({
        date: date.includes('/') ? parseDate(date, 'dd/mm/yyyy') : date,
        description: description || 'Sem descrição',
        value: Math.abs(value),
        type,
        document_number: extractTag(block, 'documento') || extractTag(block, 'docNumber') || null,
        raw_data: block.trim(),
      });
    }
  }

  return transactions;
}

// ============================================
// XLSX Parsers (com detecção automática de banco)
// ============================================

type XlsxBankFormat = 'sicoob' | 'stone' | 'generic';

/**
 * Detecta o formato do banco a partir das primeiras linhas do XLSX.
 */
function detectXlsxBankFormat(rows: unknown[][]): XlsxBankFormat {
  if (rows.length < 2) return 'generic';

  const firstRowStr = String(rows[0]?.[0] ?? '').toLowerCase().trim();

  // SICOOB: primeira linha "EXTRATO CONTA CORRENTE", segunda linha header DATA/DOCUMENTO/HISTÓRICO/VALOR
  if (firstRowStr === 'extrato conta corrente') {
    const secondRow = (rows[1] || []).map((c) => String(c ?? '').toLowerCase().trim());
    if (secondRow.includes('data') && secondRow.includes('valor')) {
      return 'sicoob';
    }
  }

  // STONE: primeira linha é header com "Movimentação", "Tipo", "Valor", "Saldo antes"
  const headerRow = (rows[0] || []).map((c) => String(c ?? '').toLowerCase().trim());
  if (
    headerRow.some((h) => h.includes('movimenta')) &&
    headerRow.includes('tipo') &&
    headerRow.some((h) => h.includes('saldo antes'))
  ) {
    return 'stone';
  }

  return 'generic';
}

// ============================================
// SICOOB XLSX Parser
// ============================================

/**
 * Parseia valor no formato SICOOB: "-\xa0486,60 D" ou "70,00 C"
 * Sufixo D = Débito (expense), C = Crédito (income)
 */
function parseSicoobValue(valorStr: string): { value: number; type: TransactionType } {
  const cleaned = valorStr.replace(/\xa0/g, ' ').trim();
  const isDebit = cleaned.toUpperCase().endsWith('D');

  // Remove sufixo D/C e espaços
  let numStr = cleaned.replace(/[DC]\s*$/i, '').trim();
  numStr = numStr.replace(/[^\d,.\-]/g, '');

  // Formato brasileiro
  if (numStr.includes(',')) {
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  }

  const value = Math.abs(parseFloat(numStr) || 0);
  const type: TransactionType = isDebit ? 'expense' : 'income';

  return { value, type };
}

interface SicoobEntry {
  date: string;
  doc: string;
  historico: string;
  valor: string;
  descLines: string[];
}

function flushSicoobEntry(
  entry: SicoobEntry,
  transactions: ParsedTransaction[]
): void {
  const { value, type } = parseSicoobValue(entry.valor);
  if (value === 0) return;

  // Concatena histórico + linhas de continuação (nome, CPF/CNPJ, obs.)
  const descParts = [entry.historico, ...entry.descLines].filter(Boolean);
  const description = descParts.join(' | ');

  // Parseia data dd/mm/yyyy → yyyy-mm-dd
  let dateStr = '';
  if (entry.date.includes('/')) {
    const [d, m, y] = entry.date.split('/');
    dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  } else {
    dateStr = entry.date;
  }

  transactions.push({
    date: dateStr,
    description,
    value,
    type,
    document_number: entry.doc || null,
    raw_data: JSON.stringify(entry),
  });
}

/**
 * Parser específico para extratos SICOOB.
 * Formato multi-linha: primeira linha tem DATA + VALOR, linhas seguintes (com data vazia) são continuação.
 * Linhas "SALDO DO DIA" são ignoradas.
 */
function parseSicoobXlsx(rows: unknown[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  let currentEntry: SicoobEntry | null = null;

  // Dados começam na linha 3 (índice 2) — após título + header
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const dateStr = String(row[0] ?? '').trim();
    const doc = String(row[1] ?? '').trim();
    const historico = String(row[2] ?? '').trim();
    const valorStr = String(row[3] ?? '').trim();

    // Ignora linhas "SALDO DO DIA"
    if (historico === 'SALDO DO DIA') {
      if (currentEntry) {
        flushSicoobEntry(currentEntry, transactions);
        currentEntry = null;
      }
      continue;
    }

    // Nova entrada: linha com data preenchida
    if (dateStr) {
      if (currentEntry) {
        flushSicoobEntry(currentEntry, transactions);
      }
      currentEntry = { date: dateStr, doc, historico, valor: valorStr, descLines: [] };
    } else if (currentEntry && historico) {
      // Linha de continuação (descrição adicional)
      currentEntry.descLines.push(historico);
    }
  }

  // Flush da última entrada
  if (currentEntry) {
    flushSicoobEntry(currentEntry, transactions);
  }

  return transactions;
}

// ============================================
// STONE XLSX Parser
// ============================================

/**
 * Parser específico para extratos Stone.
 * 19 colunas: Movimentação, Tipo, Valor, Saldo antes/depois, Tarifa, Data, etc.
 * Descrição é composta a partir de Tipo + contraparte (Destino ou Origem).
 */
function parseStoneXlsx(rows: unknown[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  const headers = (rows[0] || []).map((c) => String(c ?? '').toLowerCase().trim());

  const tipoIdx = headers.indexOf('tipo');
  const valorIdx = headers.indexOf('valor');
  const dataIdx = headers.indexOf('data');
  const destinoIdx = headers.indexOf('destino');
  const origemIdx = headers.indexOf('origem');

  if (valorIdx === -1 || dataIdx === -1) return [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];

    const tipo = String(row[tipoIdx] ?? '').trim();
    const valorStr = String(row[valorIdx] ?? '').trim();
    const dataStr = String(row[dataIdx] ?? '').trim();
    const destino = destinoIdx !== -1 ? String(row[destinoIdx] ?? '').trim() : '';
    const origem = origemIdx !== -1 ? String(row[origemIdx] ?? '').trim() : '';

    if (!dataStr || !valorStr) continue;

    const value = parseValue(valorStr);
    if (value === 0) continue;

    const type: TransactionType = value >= 0 ? 'income' : 'expense';

    // Contraparte: para débitos usa Destino, para créditos usa Origem
    const counterpart = type === 'expense' ? destino : origem;
    const isUsefulCounterpart =
      counterpart &&
      counterpart.toLowerCase() !== 'desconhecido' &&
      !counterpart.toLowerCase().includes('stone principal');

    const description = isUsefulCounterpart ? `${tipo} - ${counterpart}` : tipo;

    // Data pode vir como "dd/mm/yyyy HH:mm"
    const datePart = dataStr.split(' ')[0];
    let dateStr = '';
    if (datePart.includes('/')) {
      const [d, m, y] = datePart.split('/');
      dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    if (!dateStr) continue;

    transactions.push({
      date: dateStr,
      description,
      value: Math.abs(value),
      type,
      document_number: null,
      raw_data: JSON.stringify(
        Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
      ),
    });
  }

  return transactions;
}

// ============================================
// XLSX Parser Genérico (para formatos desconhecidos)
// ============================================

function parseGenericXlsx(sheet: XLSX.WorkSheet): ParsedTransaction[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (rows.length === 0) return [];

  // Detectar colunas automaticamente pelo header
  const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());

  const dateIdx = headers.findIndex((h) =>
    /^(data|date|dt|vencimento|dtmovimento|data.?lan)/i.test(h)
  );
  const descIdx = headers.findIndex((h) =>
    /^(descri|description|historico|hist|memo|detalhe|observa)/i.test(h)
  );
  const valueIdx = headers.findIndex((h) =>
    /^(valor|value|amount|vlr|quantia|total|saldo)/i.test(h)
  );

  if (dateIdx === -1 || valueIdx === -1) {
    throw new Error(
      'Não foi possível identificar as colunas de data e valor na planilha. Verifique se os headers contêm "Data" e "Valor".'
    );
  }

  const keys = Object.keys(rows[0]);
  const dateKey = keys[dateIdx];
  const descKey = descIdx !== -1 ? keys[descIdx] : null;
  const valueKey = keys[valueIdx];

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const rawDate = row[dateKey];
    const rawValue = row[valueKey];
    const rawDesc = descKey ? String(row[descKey] ?? '') : 'Sem descrição';

    // Parsear data (pode ser serial do Excel ou string)
    let dateStr = '';
    if (typeof rawDate === 'number') {
      const excelDate = XLSX.SSF.parse_date_code(rawDate);
      dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
    } else if (typeof rawDate === 'string' && rawDate.trim()) {
      if (rawDate.includes('/')) {
        dateStr = parseDate(rawDate, 'dd/mm/yyyy');
      } else {
        dateStr = rawDate.trim();
      }
    }

    if (!dateStr) continue;

    // Parsear valor
    const value = typeof rawValue === 'number' ? rawValue : parseValue(String(rawValue));
    if (value === 0) continue;

    const type: TransactionType = value >= 0 ? 'income' : 'expense';

    transactions.push({
      date: dateStr,
      description: rawDesc.trim() || 'Sem descrição',
      value: Math.abs(value),
      type,
      document_number: null,
      raw_data: JSON.stringify(row),
    });
  }

  return transactions;
}

// ============================================
// Entry point XLSX (com detecção de banco)
// ============================================

export function parseXlsx(buffer: ArrayBuffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Lê como array de arrays para detecção do formato bancário
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rawRows.length < 2) return [];

  const bankFormat = detectXlsxBankFormat(rawRows);

  switch (bankFormat) {
    case 'sicoob':
      return parseSicoobXlsx(rawRows);
    case 'stone':
      return parseStoneXlsx(rawRows);
    default:
      return parseGenericXlsx(sheet);
  }
}

// ============================================
// Detector de formato + Parser unificado
// ============================================

export function detectFormat(fileName: string, content?: string): ImportFileFormat {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return 'xlsx';
  }

  if (ext === 'ofx' || ext === 'qfx' || (content && (content.includes('OFXHEADER') || content.includes('<OFX>')))) {
    return 'ofx';
  }

  if (ext === 'xml' || (content && (content.trim().startsWith('<?xml') || content.trim().startsWith('<')))) {
    return 'xml';
  }

  return 'csv';
}

export function parseExtrato(
  content: string,
  fileName: string,
  csvOptions?: Partial<CsvParserOptions>
): { format: ImportFileFormat; transactions: ParsedTransaction[] } {
  const format = detectFormat(fileName, content);

  let transactions: ParsedTransaction[];
  switch (format) {
    case 'ofx':
      transactions = parseOfx(content);
      break;
    case 'xml':
      transactions = parseXml(content);
      break;
    case 'csv':
    default:
      transactions = parseCsv(content, csvOptions);
      break;
  }

  // Ordena por data
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return { format, transactions };
}

export function parseExtratoXlsx(
  buffer: ArrayBuffer,
): { format: ImportFileFormat; transactions: ParsedTransaction[] } {
  const transactions = parseXlsx(buffer);
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return { format: 'xlsx' as ImportFileFormat, transactions };
}
