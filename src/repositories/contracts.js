/**
 * Fase 1 — Camada de repositórios.
 *
 * Este arquivo não exporta código executável: documenta, via JSDoc, o
 * contrato que cada domínio expõe através de `repositories.<dominio>`.
 * A implementação atual (`./firebase/*Repository.js`) satisfaz esses
 * contratos usando o Firestore por baixo dos panos; a Fase 3 adicionará uma
 * implementação `./sqlite/*Repository.js` que satisfaz os mesmos contratos
 * usando SQLite no Android, e `./provider.js` passará a escolher qual usar
 * conforme a plataforma. Nenhuma tela deve importar um serviço de feature
 * (`features/*\/services/*Service.js`) diretamente — apenas `repositories`.
 *
 * @typedef {Object} LancamentosRepository
 * @property {(uid: string, monthKey: string, opts?: object) => Promise<object[]>} listByMonth
 * @property {(uid: string) => Promise<object[]>} listAll
 * @property {(uid: string, gte: string, lte: string) => Promise<object[]>} listByRange
 * @property {(uid: string) => Promise<boolean>} hasAny
 * @property {(uid: string, data: object) => Promise<object>} create
 * @property {(uid: string, id: string, data: object) => Promise<void>} update
 * @property {(uid: string, id: string) => Promise<void>} remove
 * @property {(uid: string) => Promise<void>} removeAll
 * @property {(uid: string, ids: string[]) => Promise<void>} removeByIds
 * @property {(uid: string, id: string, status: string) => Promise<void>} setStatus
 * @property {(uid: string, recorrenciaId: string, categoriaId: string|null) => Promise<void>} setCategoriaForRecorrencia
 * @property {(uid: string, recorrenciaId: string, data: object, fromMonthKey: string) => Promise<number>} updateGeneratedFromRecorrencia
 * @property {(uid: string, recorrenciaId: string, opts?: object) => Promise<void>} removeGeneratedFromRecorrencia
 * @property {(dados: object) => { parcelamentoId: string, itemsById: object }} buildParcelamentoItems
 * @property {(uid: string, dados: object) => Promise<string>} createParcelamento
 * @property {(itens: object[], idsExistentes: Set<string>) => { novos: object, totalConsiderados: number }} buildImportPayload
 * @property {(uid: string, itens: object[]) => Promise<{ importados: number, duplicados: number }>} importLancamentos
 * @property {(uid: string, updatesById: object) => Promise<void>} updateEmMassa
 *
 * @typedef {Object} CategoriasRepository
 * @property {(uid: string) => Promise<object[]>} list
 * @property {(uid: string, data: object) => Promise<object>} create
 * @property {(uid: string, id: string, data: object) => Promise<void>} update
 * @property {(uid: string, id: string) => Promise<void>} remove
 * @property {(uid: string) => Promise<void>} removeAll
 * @property {(uid: string) => Promise<object[]>} ensureDefaults
 *
 * @typedef {Object} RegrasCategorizacaoRepository
 * @property {(uid: string) => Promise<object[]>} list
 * @property {(uid: string, data: object) => Promise<object>} create
 * @property {(uid: string, id: string, data: object) => Promise<void>} update
 * @property {(uid: string, id: string) => Promise<void>} remove
 * @property {(uid: string, regras: object[], lancamentos: object[], sobrescrever?: boolean) => Promise<number>} aplicarAosAntigos
 *
 * @typedef {Object} RecorrenciasRepository
 * @property {(uid: string) => Promise<object[]>} list
 * @property {(uid: string, data: object) => Promise<object>} create
 * @property {(uid: string, id: string, data: object) => Promise<void>} update
 * @property {(uid: string, id: string) => Promise<void>} remove
 * @property {(uid: string, monthKeys: string[], pre?: object[]) => Promise<boolean>} ensureGeneratedForMonths
 * @property {(uid: string, monthKey: string, pre?: object[]) => Promise<boolean>} ensureGeneratedForMonth
 *
 * @typedef {Object} MetasRepository
 * @property {(uid: string) => Promise<object[]>} list
 * @property {(uid: string, data: object) => Promise<object>} create
 * @property {(uid: string, id: string, data: object) => Promise<void>} update
 * @property {(uid: string, id: string) => Promise<void>} remove
 * @property {(uid: string, meta: object, valor: number) => Promise<void>} aportar
 * @property {(meta: object, lancamentos: object[], fechamento: object|null) => number} calcularAporteAutomatico
 * @property {(uid: string, metas: object[], lancamentos: object[], fechamento: object|null, monthKey: string) => Promise<number>} processarAportesAutomaticos
 * @property {(meta: object, aporteMensal: number, monthKey: string) => string|null} preverConclusao
 *
 * @typedef {Object} ValorLivreRepository
 * @property {(uid: string, monthKey: string) => Promise<{distribuicoes: object[], personalizada: boolean}>} getDistribuicao
 * @property {(uid: string, monthKey: string) => Promise<object[]>} getDistribuicaoMensal
 * @property {(uid: string, monthKey: string, distribuicoes: object[]) => Promise<void>} setDistribuicaoMensal
 * @property {(uid: string, monthKey: string, distribuicoes: object[], personalizada?: boolean) => Promise<void>} setDistribuicao
 * @property {(uid: string, monthKey: string) => Promise<number|null>} getValorBaseMensal
 * @property {(uid: string, monthKey: string, valor: number) => Promise<number>} setValorBaseMensal
 * @property {(uid: string, monthKey: string, valorCalculado: number) => Promise<number>} ensureValorBaseMensal
 * @property {(uid: string, monthKey: string) => Promise<{valorBaseMensal: number|null, gastosIniciais: object}>} getFotografiaMensal
 * @property {(uid: string, monthKey: string, valorCalculado: number, gastosIniciais: object) => Promise<{valorBaseMensal: number, gastosIniciais: object}>} ensureFotografiaMensal
 * @property {(uid: string, monthKey: string, valor: number, gastosIniciais: object) => Promise<{valorBaseMensal: number, gastosIniciais: object, movimentoAtualizadoEm: string}>} setValorBaseDoMovimento
 *
 * @typedef {Object} PlanejamentoRepository
 * @property {(uid: string, monthKey: string) => Promise<{ saldoInicial: number, orcamentos: object }>} getMensal
 * @property {(uid: string, monthKey: string, saldoInicial: number) => Promise<void>} setSaldoInicial
 * @property {(uid: string, monthKey: string, categoriaId: string, valor: number, currentBudgets?: object) => Promise<object>} setOrcamentoCategoria
 *
 * @typedef {Object} FechamentosRepository
 * @property {(uid: string, monthKey: string) => Promise<object|null>} get
 * @property {(uid: string, monthKey: string, resumo: object, saldoReal: number, observacoes: string|null, levarPendencias: boolean) => Promise<object>} fechar
 *
 * @typedef {Object} GestorRepository
 * @property {(uid: string) => Promise<object[]>} list
 * @property {(uid: string, data: object) => Promise<object>} create
 * @property {(uid: string, id: string, data: object) => Promise<void>} update
 * @property {(uid: string, id: string) => Promise<void>} remove
 * @property {(uid: string, ids: string[]) => Promise<void>} removeByIds
 * @property {(uid: string) => Promise<void>} removeAll
 * @property {(uid: string, dados: object) => Promise<string>} createParcelamento
 * @property {(uid: string, lancamentosSelecionados: object[]) => Promise<{ importados: number, duplicados: number }>} importarDoMovimento
 * @property {(uid: string, itens: object[]) => Promise<{ importados: number, duplicados: number }>} importarFatura
 * @property {(uid: string, recorrenciasSelecionadas: object[]) => Promise<{ importados: number, duplicados: number }>} importarRecorrencias
 * @property {(uid: string) => Promise<boolean>} getUsaMovimento
 * @property {(uid: string, value: boolean) => Promise<void>} setUsaMovimento
 *
 * @typedef {Object} ConfiguracoesRepository
 * @property {(uid: string) => Promise<number|null>} getMetaEconomiaMensal
 * @property {(uid: string, valor: number) => Promise<void>} setMetaEconomiaMensal
 * @property {(uid: string) => Promise<{enabled: boolean, day: number}>} getValorLivreAutomatico
 * @property {(uid: string, config: {enabled: boolean, day: number}) => Promise<void>} setValorLivreAutomatico
 * @property {(uid: string) => Promise<{ completed: boolean, skipped: boolean }>} getOnboardingState
 * @property {(uid: string) => Promise<void>} skipOnboarding
 * @property {(uid: string, data: object) => Promise<void>} completeOnboarding
 *
 * @typedef {Object} Repositories
 * @property {LancamentosRepository} lancamentos
 * @property {CategoriasRepository} categorias
 * @property {RegrasCategorizacaoRepository} regrasCategorizacao
 * @property {RecorrenciasRepository} recorrencias
 * @property {MetasRepository} metas
 * @property {ValorLivreRepository} valorLivre
 * @property {PlanejamentoRepository} planejamento
 * @property {FechamentosRepository} fechamentos
 * @property {GestorRepository} gestor
 * @property {ConfiguracoesRepository} configuracoes
 */

export {};
