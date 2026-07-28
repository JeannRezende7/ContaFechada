function normalize(value = '') {
  return String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
}

export function filtrarBuscaGlobal(items, filters) {
  const query = normalize(filters.query);
  const min = filters.valorMin === '' ? null : Number(filters.valorMin);
  const max = filters.valorMax === '' ? null : Number(filters.valorMax);
  return items.filter((item) => {
    if (filters.recurso !== 'todos' && item.recurso !== filters.recurso) return false;
    if (filters.tipo !== 'todos' && item.tipo !== filters.tipo) return false;
    if (filters.status !== 'todos' && item.status !== filters.status) return false;
    if (filters.categoriaId && item.categoriaId !== filters.categoriaId) return false;
    if (filters.de && (!item.data || item.data < filters.de)) return false;
    if (filters.ate && (!item.data || item.data > filters.ate)) return false;
    if (min != null && Number(item.valor) < min) return false;
    if (max != null && Number(item.valor) > max) return false;
    return !query || normalize(`${item.titulo} ${item.subtitulo || ''}`).includes(query);
  });
}
