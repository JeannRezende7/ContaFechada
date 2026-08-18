# Roadmap de Publicacao - Conta Fechada: Gestor Pessoal

Ultima revisao: 18/08/2026

## Progresso da auditoria de pre-lancamento

- [x] Executar testes automatizados e testes das regras do Firestore.
- [x] Executar lint, build Web, build Android e auditoria do bundle.
- [x] Corrigir as falhas encontradas na verificacao automatizada.
- [x] Registrar evidencias reais das validacoes neste roadmap.
- [x] Revisar textos comerciais e remover da interface promessas de mensalidade, teste gratis e nuvem indisponivel.
- [x] Padronizar **Pro vitalicio**, **pagamento unico** e **Conta Fechada: Gestor Pessoal**.
- [x] Implementar compra unica, estados da compra e restauracao.
- [x] Adaptar a validacao da compra unica no servidor e cobri-la com testes.
- [x] Ampliar protecoes e testes de backup, recuperacao, migracao e duplicidade.
- [x] Separar configuracoes de anuncios de teste e producao e testar o espacamento do banner.
- [x] Preparar descricoes, declaracoes e roteiro de screenshots da Play Store.
- [x] Remover definitivamente o backend legado de assinatura recorrente.
- [ ] Validar compra e restauracao com o produto criado na Play Console.
- [ ] Concluir testes manuais em aparelhos reais e gerar o AAB assinado.

Os itens ainda abertos nos marcos abaixo nao foram esquecidos: dependem de
configuracao externa, distribuicao pela Play Store ou validacao manual em
aparelhos reais e, por isso, nao podem ser marcados apenas pelo codigo.

## Objetivo

Publicar uma versao estavel na Google Play com:

- uso gratuito local e ilimitado, com anuncios;
- Pro vitalicio por pagamento unico;
- restauracao da compra em outros aparelhos;
- login Google opcional, sem colocar dados locais em risco;
- backup manual por arquivo;
- backup em nuvem mantido oculto ate uma fase posterior.

## Regra de liberacao

A versao publica somente pode ser enviada quando todos os itens marcados como
**Bloqueador** estiverem concluidos. Falhas que possam apagar, substituir ou
duplicar dados financeiros bloqueiam a publicacao.

---

## Marco 1 - Fechar o produto da primeira versao

- [x] Definir o nome: **Conta Fechada: Gestor Pessoal**.
- [x] Definir modelo gratuito: dados locais ilimitados com anuncios.
- [x] Definir modelo Pro: pagamento unico de R$ 39,90.
- [x] Definir os diferenciais exibidos na tela do Pro.
- [x] Ocultar backup em nuvem enquanto o servico nao estiver pronto.
- [x] Ativar bloqueios dos recursos Pro.
- [x] Remover anuncios para usuarios com acesso Pro.
- [x] Revisar todos os textos e remover promessas de recursos indisponiveis.
- [ ] Confirmar o preco final e se havera preco promocional de lancamento.
- [ ] Congelar novas funcionalidades ate a publicacao.

**Criterio de conclusao:** escopo, preco e comunicacao nao possuem contradicoes.

## Marco 2 - Compra unica do Pro (Bloqueador)

O fluxo de compra unica esta implementado no aplicativo e no servidor. A
ativacao real depende agora do produto nao consumivel na Play Console e da
validacao na faixa interna.

- [ ] Criar o produto Pro vitalicio na Play Console.
- [x] Definir e documentar o `productId` definitivo.
- [x] Integrar uma implementacao nativa compativel com Google Play Billing.
- [x] Fazer o botao **Comprar Pro** abrir a compra real.
- [x] Validar o token da compra no servidor usando a API correta para produto unico.
- [x] Confirmar/acknowledge a compra dentro do prazo exigido pela Google Play.
- [x] Gravar `proLifetime` somente pelo servidor; o aplicativo nao pode se conceder Pro.
- [x] Implementar **Restaurar compra** na tela Meu Plano.
- [x] Recuperar o Pro automaticamente apos reinstalacao ou troca de aparelho.
- [x] Tratar compra cancelada, pendente, ja adquirida e falha de rede.
- [x] Impedir que o mesmo token seja associado indevidamente a contas diferentes.
- [ ] Remover ou isolar fluxos antigos de assinatura que nao pertencem ao Pro vitalicio.
- [x] Adicionar testes automatizados do cliente, validacao e restauracao.
- [ ] Testar ponta a ponta com conta de teste da Play Store.

**Criterio de conclusao:** comprar, reinstalar e restaurar libera o Pro sem acao
manual e sem permitir liberacao pelo cliente.

## Marco 3 - Dados locais, login e recuperacao (Bloqueador)

- [x] Manter o uso gratuito sem conta.
- [x] Disponibilizar exportacao e restauracao por arquivo JSON.
- [x] Avisar sobre backup antes de trocar ou limpar o aparelho.
- [x] Evitar que a recuperacao inicial mostre o tutorial por cima.
- [x] Testar criacao, edicao e exclusao offline dos dados cobertos pelos repositorios locais.
- [ ] Forcar encerramento do app e confirmar persistencia ao reabrir.
- [ ] Reiniciar o aparelho e confirmar persistencia dos dados.
- [x] Exportar, restaurar e comparar contagens, receitas, despesas e saldo automaticamente.
- [ ] Entrar em conta antiga e comparar dados remotos e locais antes/depois.
- [x] Interromper a migracao e confirmar retomada sem perda.
- [x] Repetir migracao e restauracao sem criar duplicatas.
- [x] Confirmar automaticamente que logout nao executa exclusao remota.
- [x] Fazer login novamente sem enviar uma base local vazia sobre a nuvem.
- [ ] Testar troca de aparelho com e sem arquivo de backup.
- [ ] Registrar evidencias conforme `docs/TESTES_MANUAIS_LOCAL_FIRST.md`.

Validacoes automatizadas concluidas:

- [x] Comparar contagens e total financeiro durante a restauracao do backup.
- [x] Reverter a restauracao automaticamente quando houver divergencia.
- [x] Testar migracao interrompida, repeticao sem duplicatas e base remota vazia.
- [x] Manter snapshot interno antes de substituir os dados locais.

**Criterio de conclusao:** nenhuma operacao testada perde ou duplica valores.

## Marco 4 - Anuncios e consentimento (Bloqueador)

- [x] Configurar o ID real do aplicativo AdMob no Android.
- [x] Configurar o ID real do banner principal.
- [x] Publicar `app-ads.txt` no dominio do aplicativo.
- [x] Ocultar banner para usuarios Pro.
- [ ] Confirmar que o aplicativo aparece como verificado no AdMob.
- [ ] Validar consentimento de anuncios em instalacao limpa.
- [ ] Testar comportamento quando o consentimento e recusado ou indisponivel.
- [ ] Confirmar que o banner nao cobre botoes, listas ou navegacao.
- [ ] Testar banner em aparelhos pequenos, grandes e com navegacao por gestos.
- [x] Confirmar por configuracao e teste automatizado que builds internas usam modo de teste.
- [ ] Confirmar que anuncios reais aparecem apenas na versao de producao.
- [ ] Revisar a implementacao contra as politicas vigentes da AdMob.

**Criterio de conclusao:** anuncios nao quebram a interface, respeitam consentimento
e desaparecem imediatamente para o usuario Pro.

## Marco 5 - Qualidade e observabilidade (Bloqueador)

- [x] Manter lint e testes automatizados no projeto.
- [x] Manter checklist automatizado em `npm run check:prelaunch`.
- [x] Executar `npm run check:prelaunch:rules` em ambiente limpo.
- [ ] Corrigir todos os erros e alertas relevantes do build de release.
- [ ] Testar instalacao limpa do APK/AAB de release, nao apenas pelo Android Studio.
- [ ] Testar Android na menor e na maior versao suportadas pelo projeto.
- [ ] Testar telas principais em aparelhos estreitos e com fonte ampliada.
- [ ] Testar modo claro, escuro e alternancia durante o uso.
- [ ] Testar funcionamento offline e retorno da conexao.
- [x] Adicionar captura de falhas nativas e JavaScript com Firebase Crashlytics.
- [x] Sanitizar logs de producao para remover valores financeiros, tokens e dados pessoais.
- [ ] Migrar React Router 6 para uma versao sem os 2 alertas moderados restantes do `npm audit`.
- [ ] Criar um canal simples de suporte/contato dentro do app ou na ficha da loja.

**Criterio de conclusao:** build de release aprovado e erros de producao podem ser
detectados e investigados.

## Marco 6 - Preparar a Google Play (Bloqueador)

- [ ] Criar/confirmar o aplicativo com o pacote `com.contafechada.app`.
- [ ] Configurar Play App Signing e guardar os acessos de assinatura com seguranca.
- [ ] Gerar um Android App Bundle (`.aab`) assinado em modo release.
- [ ] Incrementar `versionCode` e definir `versionName` da versao de publicacao.
- [ ] Confirmar nome, icone, splash e rotulo instalados no aparelho.
- [ ] Preparar icone da loja, banner e screenshots reais do aplicativo.
- [x] Gerar e auditar um Android App Bundle (`.aab`) de release ainda sem assinatura.
- [x] Automatizar conferencia e incremento de `versionCode`/`versionName`.
- [x] Escrever descricao curta e descricao completa da ficha.
- [ ] Informar e-mail e pagina de suporte.
- [ ] Publicar Termos de Uso e Politica de Privacidade em URLs estaveis.
- [ ] Preencher Seguranca dos dados de acordo com Firebase, login e AdMob.
- [ ] Preencher declaracao de anuncios.
- [ ] Preencher classificacao indicativa e publico-alvo.
- [x] Preparar inventario para Seguranca dos dados e declaracao de anuncios.
- [x] Preparar roteiro de screenshots reais sem dados pessoais.
- [x] Revisar permissoes e remover `POST_NOTIFICATIONS` e o plugin de notificacoes locais.
- [ ] Configurar o produto Pro vitalicio para a mesma faixa de testes.
- [ ] Conferir todas as exigencias pendentes mostradas pela Play Console.

**Criterio de conclusao:** Play Console permite promover o AAB sem pendencias.

## Marco 7 - Teste fechado (Bloqueador)

- [ ] Publicar primeiro na faixa de teste interno.
- [ ] Instalar exclusivamente pela Play Store em pelo menos dois aparelhos reais.
- [ ] Validar compra, cancelamento durante o fluxo e restauracao do Pro.
- [ ] Validar anuncios na distribuicao da Play Store.
- [ ] Validar login Google, uso sem conta, logout e novo login.
- [ ] Validar importacao por print, CSV, OFX e backup JSON.
- [ ] Validar notificacoes e recorrencias atraves da virada de dia/mes.
- [ ] Distribuir para um grupo fechado de 5 a 15 pessoas.
- [ ] Coletar falhas, modelo do aparelho, versao do Android e passos para reproduzir.
- [ ] Corrigir todos os problemas de perda de dados, compra, login e travamentos.
- [ ] Manter a versao candidata sem bloqueadores durante pelo menos 7 dias de teste.

**Criterio de conclusao:** nenhum bloqueador aberto e fluxo principal aprovado por
usuarios externos ao desenvolvimento.

## Marco 8 - Publicacao gradual

- [ ] Criar tag Git da versao publicada.
- [ ] Guardar o AAB, mapeamentos e notas da versao em local seguro.
- [ ] Publicar primeiro para uma porcentagem pequena dos usuarios, quando disponivel.
- [ ] Monitorar falhas, avaliacoes, compras e validacoes do servidor diariamente.
- [ ] Pausar a distribuicao se houver perda de dados, compra sem liberacao ou travamento.
- [ ] Ampliar a distribuicao gradualmente apos estabilidade.
- [ ] Registrar problemas conhecidos e preparar a primeira correcao sem novos recursos.

## Pos-lancamento - Nao bloqueia a primeira versao

- [ ] Backup automatico em nuvem mensal.
- [ ] Fluxo comercial e restauracao do plano de nuvem.
- [ ] Sincronizacao continua entre varios aparelhos.
- [ ] Melhorias baseadas em uso real e feedback dos usuarios.
- [ ] Testes de variacao de preco e comunicacao, sem alterar direitos de compradores.
- [ ] Automacao de build, assinatura e distribuicao.

---

## Ordem recomendada de execucao

1. Marco 2 - Compra unica do Pro.
2. Marco 3 - Dados locais, login e recuperacao.
3. Marco 4 - Anuncios e consentimento.
4. Marco 5 - Qualidade e observabilidade.
5. Marco 6 - Google Play.
6. Marco 7 - Teste fechado.
7. Marco 8 - Publicacao gradual.

## Registro de decisoes

Use esta secao para evitar que decisoes importantes fiquem apenas em conversas.

| Data | Decisao | Motivo |
| --- | --- | --- |
| 18/08/2026 | Pro sera uma compra unica de R$ 39,90 | Evitar mensalidade para funcoes locais |
| 18/08/2026 | Backup em nuvem nao entra na primeira versao | Exige operacao e cobranca mensal separadas |
| 18/08/2026 | Gratuito continua ilimitado localmente | Monetizacao por anuncios e conveniencia Pro |

## Evidencias automatizadas

Execucao de 18/08/2026:

- `npm run check:prelaunch:rules`: aprovado.
- Testes unitarios/integracao: 55 arquivos e 209 testes aprovados apos a remocao dos fluxos legados.
- Regras do Firestore: 10 testes aprovados no emulador.
- Lint, build Web, build Android e auditoria do bundle: aprovados.
- AAB de release gerado em `android/app/build/outputs/bundle/release/app-release.aab`.
- AAB atual ainda sem assinatura de publicacao; o respectivo bloqueador permanece aberto.
- Lint Android `release` e resolucao da arvore de dependencias nativas: aprovados.
- Crashlytics integrado ao bundle Android e captura JavaScript coberta por testes de sanitizacao.
- `npm audit --omit=dev`: vulnerabilidade de PDF corrigida; restam 2 alertas moderados do React Router 6 que exigem migracao principal.
