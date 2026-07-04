/** Display order for category groups, shared by CategoriasPage and the LancamentoModal picker. */
export const GROUP_ORDER = [
  { label: 'Renda Principal', emoji: '💼' },
  { label: 'Renda Extra', emoji: '🚀' },
  { label: 'Outros Recebimentos', emoji: '💸' },
  { label: 'Moradia', emoji: '🏠' },
  { label: 'Transporte', emoji: '🚗' },
  { label: 'Cuidados Pessoais', emoji: '🛒' },
  { label: 'Lazer & Estilo de Vida', emoji: '🍕' },
  { label: 'Evolução', emoji: '🎓' },
  { label: 'Dívidas', emoji: '📉' },
  { label: 'Patrimônio', emoji: '🛡️' },
];

let n = 0;
const item = (nome, tipo, grupo, corKey) => ({ nome, tipo, grupo, corKey, ordem: n++ });

/** Seeded once per user on first visit to Categorias (see ensureDefaultCategorias). */
export const DEFAULT_CATEGORIAS = [
  item('Salário / Pró-labore', 'receita', 'Renda Principal', 'verde'),
  item('Aposentadoria / Proventos', 'receita', 'Renda Principal', 'verde'),

  item('Freelances / Projetos', 'receita', 'Renda Extra', 'verdeClaro'),
  item('Vendas / Desapegos', 'receita', 'Renda Extra', 'verdeClaro'),
  item('Comissões / Bônus', 'receita', 'Renda Extra', 'verdeClaro'),

  item('Pix de Terceiros', 'receita', 'Outros Recebimentos', 'menta'),
  item('Cashback / Estornos', 'receita', 'Outros Recebimentos', 'menta'),
  item('Rendimentos', 'receita', 'Outros Recebimentos', 'menta'),

  item('Aluguel / Financiamento / Condomínio', 'despesa', 'Moradia', 'azul'),
  item('Contas da Casa (Luz, Água, Gás)', 'despesa', 'Moradia', 'azul'),
  item('Internet / TV / Celular', 'despesa', 'Moradia', 'azul'),
  item('Mercado', 'despesa', 'Moradia', 'azul'),
  item('Faxina / Manutenção', 'despesa', 'Moradia', 'azul'),

  item('Combustível', 'despesa', 'Transporte', 'cinza'),
  item('Apps de Transporte (Uber, 99)', 'despesa', 'Transporte', 'cinza'),
  item('Transporte Público', 'despesa', 'Transporte', 'cinza'),
  item('Manutenção / Seguro / IPVA', 'despesa', 'Transporte', 'cinza'),

  item('Farmácia / Médicos', 'despesa', 'Cuidados Pessoais', 'azulClaro'),
  item('Academia / Esportes', 'despesa', 'Cuidados Pessoais', 'azulClaro'),
  item('Higiene / Beleza', 'despesa', 'Cuidados Pessoais', 'azulClaro'),
  item('Pets', 'despesa', 'Cuidados Pessoais', 'azulClaro'),

  item('Delivery / iFood', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),
  item('Bares / Restaurantes', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),
  item('Cinema / Shows', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),
  item('Viagens', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),
  item('Compras', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),
  item('Jogos / Hobbies', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),
  item('Streaming / Assinaturas', 'despesa', 'Lazer & Estilo de Vida', 'roxo'),

  item('Cursos / Facul', 'despesa', 'Evolução', 'amarelo'),
  item('Livros / Softwares', 'despesa', 'Evolução', 'amarelo'),

  item('Empréstimos / Financiamentos', 'despesa', 'Dívidas', 'vermelho'),
  item('Tarifas Bancárias', 'despesa', 'Dívidas', 'vermelho'),
  item('Juros / Multas', 'despesa', 'Dívidas', 'vermelho'),

  item('Investimentos', 'despesa', 'Patrimônio', 'dourado'),
  item('Reserva de Emergência', 'despesa', 'Patrimônio', 'dourado'),
];
