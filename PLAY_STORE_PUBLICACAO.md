# Material da Google Play - Conta Fechada: Gestor Pessoal

Ultima revisao: 18/08/2026

## Identidade

- Nome: **Conta Fechada: Gestor Pessoal**
- Nome curto no aparelho: **Conta Fechada**
- Pacote: `com.contafechada.app`
- Categoria sugerida: Financas
- Modelo: gratuito com anuncios; Pro vitalicio por compra unica
- Produto Pro sugerido: `conta_fechada_pro_lifetime`

## Descricao curta

Controle gastos, receitas e planejamento financeiro direto no seu celular.

## Descricao completa

O Conta Fechada e um gestor financeiro pessoal para acompanhar receitas,
despesas e compromissos do mes com clareza.

Registre lancamentos, organize categorias e recorrencias, acompanhe o saldo e
planeje o valor livre sem depender de planilhas. Seus dados ficam disponiveis
localmente no Android, inclusive sem conexao.

Recursos gratuitos:

- lancamentos, categorias e recorrencias ilimitados;
- historico completo no aparelho;
- resumo mensal e Gestor Financeiro;
- planejamento do valor livre;
- exportacao e restauracao manual por arquivo.

Com o Conta Fechada Pro, em uma unica compra, voce remove os anuncios e libera
importacao assistida, relatorios avancados, insights, busca global, regras de
categoria e acoes em massa.

Antes de desinstalar ou trocar de celular, exporte um backup em Opcoes. O backup
automatico em nuvem nao faz parte desta versao.

## Revisao obrigatoria antes de colar na loja

- [ ] Confirmar limite de caracteres dos campos na Play Console.
- [ ] Revisar portugues e tom comercial.
- [ ] Confirmar preco exibido pela Play Store em vez de prometer preco fixo no texto.
- [ ] Adicionar e-mail de suporte real.
- [ ] Adicionar URL publica da Politica de Privacidade.
- [ ] Adicionar URL publica dos Termos de Uso.

## Declaracao de anuncios

- [x] O aplicativo contem anuncios no plano Gratuito.
- [x] O Pro remove os anuncios.
- [x] SDK utilizado: Google AdMob.
- [ ] Confirmar no aparelho que consentimento e opcoes de privacidade aparecem quando aplicavel.
- [ ] Conferir no formulario da Play Console as declaracoes exigidas na data do envio.

## Seguranca dos dados - inventario para preencher o formulario

Validar cada resposta contra o comportamento da versao final. A Play Console e
a fonte definitiva das perguntas e categorias disponiveis no momento do envio.

| Categoria | Finalidade | Tratamento atual | Acao antes do envio |
| --- | --- | --- | --- |
| Nome, e-mail e identificador da conta | Login, suporte e restauracao do Pro | Firebase Authentication | Declarar como coletado quando o usuario faz login |
| Dados financeiros inseridos | Funcao principal e recuperacao de contas antigas | Local no Android; contas antigas podem ter dados no Firestore | Declarar com precisao conforme a versao final |
| Historico de compra/identificador da compra | Liberar e restaurar Pro | Google Play e backend | Declarar como coletado para funcionalidade/prevencao a fraude |
| Identificadores e interacoes com anuncios | Publicidade e medicao | Google AdMob | Usar as informacoes oficiais do SDK no formulario |
| Diagnosticos e eventos de uso | Estabilidade e medicao | Firebase/servico de falhas quando habilitado | Confirmar SDKs presentes no AAB final |

- [ ] Confirmar criptografia em transito dos servicos usados.
- [ ] Confirmar se cada categoria e obrigatoria ou opcional.
- [ ] Confirmar se dados sao compartilhados conforme a definicao da Play Console.
- [ ] Informar que o usuario pode solicitar exclusao pelo aplicativo.
- [ ] Criar URL externa de solicitacao de exclusao, caso exigida pela Play Console.
- [ ] Revisar o formulario novamente depois de qualquer novo SDK.

## Publico-alvo e classificacao

- [ ] Definir faixa etaria pretendida.
- [ ] Responder ao questionario de classificacao indicativa com o app aberto.
- [ ] Confirmar que a comunicacao nao direciona o produto a criancas.
- [ ] Revisar politicas de familias caso alguma faixa infantil seja selecionada.

## Roteiro de screenshots reais

Usar dados ficticios coerentes, sem e-mail, nome, saldo ou lancamentos reais.
Capturar no AAB candidato instalado pela faixa interna.

1. **Lancamentos do mes** - receitas, despesas, busca e botao Novo visiveis.
2. **Resumo financeiro** - saldo, indicadores e grafico com dados legiveis.
3. **Planejamento** - valor livre e compromissos do mes.
4. **Gestor Financeiro** - indicadores que ajudem a tomar uma decisao.
5. **Importacao assistida** - etapa de revisao, sem mostrar imagem pessoal.
6. **Relatorios** - comparacao visual de periodos.
7. **Meu Plano** - somente se a tela estiver final e a compra real habilitada.

Para cada captura:

- [ ] Sem banner de teste, texto "Test Ad" ou ferramentas de desenvolvimento.
- [ ] Sem teclado, notificacoes pessoais ou barra com informacao sensivel.
- [ ] Sem elementos cortados ou sobrepostos.
- [ ] Fonte em tamanho padrao e contraste legivel.
- [ ] Mesmo conjunto de dados ficticios em todas as telas.
- [ ] Captura no tamanho aceito pela Play Console.

## Assets e ficha

- [ ] Icone da loja em alta resolucao.
- [ ] Grafico de destaque conforme dimensoes pedidas pela Play Console.
- [ ] Pelo menos duas screenshots de telefone aprovadas.
- [ ] E-mail de suporte funcional e monitorado.
- [ ] Site/URL de suporte.
- [ ] Politica de Privacidade publica e sem redirecionamentos quebrados.
- [ ] Notas da primeira versao.

## Notas sugeridas da primeira versao

Primeira versao publica do Conta Fechada: Gestor Pessoal. Controle receitas e
despesas, organize recorrencias, acompanhe o resumo mensal e planeje seu valor
livre. Use gratuitamente com anuncios ou desbloqueie o Pro em uma unica compra.

