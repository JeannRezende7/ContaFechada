let n = 0;
const item = (nome, tipo, corKey, icone) => ({ nome, tipo, corKey, icone, ordem: n++ });

/** Seeded once per user on first visit to Categorias (see ensureDefaultCategorias). */
export const DEFAULT_CATEGORIAS = [
  item('Salário / Pró-labore', 'receita', 'verde', 'wallet'),
  item('Aposentadoria / Proventos', 'receita', 'verde', 'piggyBank'),

  item('Freelances / Projetos', 'receita', 'verdeClaro', 'laptop'),
  item('Vendas / Desapegos', 'receita', 'verdeClaro', 'tag'),
  item('Comissões / Bônus', 'receita', 'verdeClaro', 'award'),

  item('Pix de Terceiros', 'receita', 'menta', 'arrowLeftRight'),
  item('Cashback / Estornos', 'receita', 'menta', 'rotateCcw'),
  item('Rendimentos', 'receita', 'menta', 'trendingUp'),

  item('Aluguel / Financiamento / Condomínio', 'despesa', 'azul', 'home'),
  item('Contas da Casa (Luz, Água, Gás)', 'despesa', 'azul', 'zap'),
  item('Internet / TV / Celular', 'despesa', 'azul', 'wifi'),
  item('Mercado', 'despesa', 'azul', 'shoppingBasket'),
  item('Faxina / Manutenção', 'despesa', 'azul', 'sprayCan'),

  item('Combustível', 'despesa', 'cinza', 'fuel'),
  item('Apps de Transporte (Uber, 99)', 'despesa', 'cinza', 'car'),
  item('Transporte Público', 'despesa', 'cinza', 'bus'),
  item('Manutenção / Seguro / IPVA', 'despesa', 'cinza', 'wrench'),

  item('Farmácia / Médicos', 'despesa', 'azulClaro', 'heartPulse'),
  item('Academia / Esportes', 'despesa', 'azulClaro', 'dumbbell'),
  item('Higiene / Beleza', 'despesa', 'azulClaro', 'sparkles'),
  item('Pets', 'despesa', 'azulClaro', 'dog'),

  item('Delivery / iFood', 'despesa', 'roxo', 'utensilsCrossed'),
  item('Bares / Restaurantes', 'despesa', 'roxo', 'beer'),
  item('Cinema / Shows', 'despesa', 'roxo', 'clapperboard'),
  item('Viagens', 'despesa', 'roxo', 'plane'),
  item('Compras', 'despesa', 'roxo', 'shoppingBag'),
  item('Jogos / Hobbies', 'despesa', 'roxo', 'gamepad2'),
  item('Streaming / Assinaturas', 'despesa', 'roxo', 'tv'),

  item('Cursos / Facul', 'despesa', 'amarelo', 'graduationCap'),
  item('Livros / Softwares', 'despesa', 'amarelo', 'bookOpen'),

  item('Empréstimos / Financiamentos', 'despesa', 'vermelho', 'landmark'),
  item('Tarifas Bancárias', 'despesa', 'vermelho', 'creditCard'),
  item('Juros / Multas', 'despesa', 'vermelho', 'alertTriangle'),

  item('Investimentos', 'despesa', 'dourado', 'lineChart'),
  item('Reserva de Emergência', 'despesa', 'dourado', 'shieldCheck'),
];
