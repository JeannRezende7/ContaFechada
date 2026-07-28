const DATE_HEADERS = ['data', 'date', 'dtposted', 'data lancamento', 'data do lancamento'];
const DESCRIPTION_HEADERS = ['descricao', 'descrição', 'historico', 'histórico', 'memo', 'name'];
const VALUE_HEADERS = ['valor', 'amount', 'trnamt'];

function clean(value = '') {
  return String(value).trim().replace(/^"|"$/g, '').trim();
}

function normalizeHeader(value) {
  return clean(value).toLocaleLowerCase('pt-BR');
}

export function parseMoney(value) {
  const raw = clean(value).replace(/[R$\s]/g, '');
  if (!raw) return NaN;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  return Number(normalized);
}

export function parseDate(value) {
  const raw = clean(value);
  const iso = raw.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return null;
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = '';
    } else current += char;
  }
  cells.push(current);
  return cells.map(clean);
}

function findIndex(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parseCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('O CSV precisa ter cabeçalho e pelo menos um lançamento.');
  const delimiter = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const dateIndex = findIndex(headers, DATE_HEADERS);
  const descriptionIndex = findIndex(headers, DESCRIPTION_HEADERS);
  const valueIndex = findIndex(headers, VALUE_HEADERS);
  if ([dateIndex, descriptionIndex, valueIndex].includes(-1)) {
    throw new Error('Não encontrei as colunas Data, Descrição/Histórico e Valor.');
  }

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line, delimiter);
    const date = parseDate(cells[dateIndex]);
    const amount = parseMoney(cells[valueIndex]);
    const description = clean(cells[descriptionIndex]);
    if (!date || !description || !Number.isFinite(amount) || amount === 0) {
      return { error: `Linha ${index + 2} inválida.` };
    }
    return {
      tipo: amount < 0 ? 'despesa' : 'receita',
      descricao: description,
      valor: Math.abs(amount),
      dataVencimento: date,
    };
  });
}

function ofxField(block, name) {
  const match = block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, 'i'));
  return clean(match?.[1]);
}

export function parseOfx(text) {
  const blocks = String(text).match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  if (blocks.length === 0) throw new Error('O arquivo OFX não contém transações.');
  return blocks.map((block, index) => {
    const date = parseDate(ofxField(block, 'DTPOSTED'));
    const amount = Number(ofxField(block, 'TRNAMT').replace(',', '.'));
    const description = ofxField(block, 'MEMO') || ofxField(block, 'NAME') || 'Lançamento importado';
    if (!date || !Number.isFinite(amount) || amount === 0) {
      return { error: `Transação ${index + 1} inválida.` };
    }
    return {
      tipo: amount < 0 ? 'despesa' : 'receita',
      descricao: description,
      valor: Math.abs(amount),
      dataVencimento: date,
    };
  });
}

export function parseExtrato(text, extension) {
  const parsed = extension.toLowerCase() === 'ofx' ? parseOfx(text) : parseCsv(text);
  return {
    items: parsed.filter((item) => !item.error),
    errors: parsed.filter((item) => item.error).map((item) => item.error),
  };
}
