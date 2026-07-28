# Fase 0 — Decisões (adotadas em 2026-07-28)

Este documento registra as decisões formais da Fase 0 do
[ROADMAP_LOCAL_FIRST_PREMIUM.md](ROADMAP_LOCAL_FIRST_PREMIUM.md), adotando as
recomendações já presentes no roadmap. As fases seguintes (a partir da Fase 1)
tratam essas decisões como regras fixas de negócio/técnicas.

## Regras adotadas

| Decisão | Valor |
|---|---|
| Retenção de dados na nuvem após cancelamento do Premium | **90 dias** |
| Tolerância offline do Premium (app funciona sem revalidar assinatura) | **7 dias** |
| Política de conflito entre aparelhos | **Alteração mais recente vence** (`updatedAt` maior prevalece) |
| Exportação manual de dados | Disponível para **todos os usuários**, gratuito e Premium |
| Sincronização entre aparelhos e acesso web | Exclusivos do **Premium** |

## Funções gratuito x Premium

- **Gratuito (Android, sem conta):** lançamentos, categorias, regras de
  categorização, recorrências, metas, valor livre, planejamento, fechamentos,
  gestor financeiro, importação de extrato/fatura, exportação/importação
  manual local — tudo operando 100% localmente.
- **Premium (Android com conta):** tudo do gratuito, mais backup automático,
  sincronização entre aparelhos e acesso web.
- **Web:** exclusiva para contas com assinatura Premium ativa (Fase 10).

## Pendências que exigem ação fora do código

Os dois itens abaixo são entregas da Fase 0 que não são alteração de código —
dependem de acesso ao Firebase Console / Google Cloud Console e ficam sob
responsabilidade do time/produto antes ou durante a Fase 1:

- **Criar ambientes Firebase separados para desenvolvimento e produção**
  (dois projetos Firebase distintos, com `firebaseConfig` própria por
  ambiente). Hoje [src/firebase/config.js](src/firebase/config.js) aponta
  para um único projeto.
- **Registrar métricas atuais de leituras, gravações e usuários ativos**,
  como linha de base para comparar o custo/uso depois da migração (Fase 13).
  Consultar o painel de uso do Firebase Console.

## Critério de conclusão

- [x] Regras comerciais e técnicas documentadas (este arquivo).
- [ ] Ambientes Firebase de desenvolvimento e produção separados.
- [ ] Métricas atuais de leitura/gravação/usuários registradas como baseline.

As duas pendências acima não bloqueiam o início da Fase 1 (camada de
repositórios), que é puramente estrutural e não depende de qual projeto
Firebase está configurado.
