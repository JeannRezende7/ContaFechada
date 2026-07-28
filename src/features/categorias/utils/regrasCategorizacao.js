function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function encontrarRegra(item, regras) {
  const descricao = normalize(item.descricao);
  return [...regras]
    .filter((regra) => regra.ativa !== false && regra.tipo === item.tipo && descricao.includes(normalize(regra.termo)))
    .sort((a, b) => Number(b.prioridade || 0) - Number(a.prioridade || 0))[0] || null;
}

export function aplicarRegras(items, regras, { sobrescrever = false } = {}) {
  return items.map((item) => {
    if (item.categoriaId && !sobrescrever) return item;
    const regra = encontrarRegra(item, regras);
    return regra ? { ...item, categoriaId: regra.categoriaId, regraCategorizacaoId: regra.id } : item;
  });
}
