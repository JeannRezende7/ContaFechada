# Precificação e custos operacionais

> Estimativas registradas em 1º de setembro de 2026. Preços do Firebase,
> câmbio, impostos e taxas de pagamento devem ser revisados antes do lançamento.

## Preço recomendado para o lançamento

- Premium mensal: **R$ 9,90**.
- Premium anual: **R$ 79,90** (equivalente a R$ 6,66 por mês).
- Teste Premium: 7 ou 14 dias.
- Evitar plano vitalício, pois nuvem, armazenamento, sincronização e suporte
  geram custos permanentes.

Depois da estabilização do produto, o preço para novos assinantes pode evoluir
para R$ 12,90 ou R$ 14,90 por mês. Os primeiros assinantes podem manter um
preço de fundador enquanto a assinatura permanecer ativa.

## Separação recomendada entre Gratuito e Premium

### Gratuito

- Uso local no Android.
- Lançamentos essenciais.
- Categorias.
- Resumo básico do mês.
- Funcionamento offline.

### Premium

- Sincronização entre Android e Web.
- Backup automático na nuvem.
- Acesso pelo computador.
- Relatórios completos.
- Evolução e comparação mensal.
- Exportação e restauração de dados.
- Planejamento avançado.
- Remoção de anúncios.

Manter o Android local no plano gratuito reduz o consumo de Firestore. Nuvem,
backup, Web e sincronização devem ser liberados pelo Premium quando
`PREMIUM_ENFORCED` for ativado.

## Cotas gratuitas atuais do Firestore

- 50.000 leituras de documentos por dia.
- 20.000 gravações de documentos por dia.
- 20.000 exclusões de documentos por dia.
- 1 GiB de armazenamento.
- 10 GiB de tráfego de saída por mês.

As cotas de operações reiniciam diariamente. No plano Spark, exceder a cota
não gera cobrança automática: as operações excedentes podem ficar indisponíveis
até a renovação. Para operação comercial, usar Blaze com alertas de orçamento.

Fonte: [cotas oficiais do Firestore](https://firebase.google.com/docs/firestore/quotas).

## Capacidade aproximada do plano gratuito

A leitura é o provável primeiro gargalo. A capacidade depende da quantidade de
documentos retornados pelas consultas, e não somente do número de requisições.

| Perfil | Leituras por usuário ativo/dia | Usuários ativos/dia |
| --- | ---: | ---: |
| Leve | 100 | aproximadamente 500 |
| Normal | 250 | aproximadamente 200 |
| Intenso | 500 | aproximadamente 100 |
| Muito intenso | 1.000 | aproximadamente 50 |

Estimativa operacional conservadora para a implementação Web atual: **150 a
250 usuários ativos por dia** antes de atingir a cota gratuita de leituras.
Esse número representa usuários ativos no dia, não o total de contas
cadastradas.

## Premissas da projeção financeira

- Mensalidade de R$ 9,90.
- 250 leituras e 5 escritas por usuário ativo por dia.
- Cinco usuários ativos totais (gratuitos e Premium) para cada assinante.
- Dólar de referência: aproximadamente R$ 5,20.
- Firestore entre US$ 0,03 e US$ 0,06 por 100 mil leituras.
- Firestore entre US$ 0,09 e US$ 0,18 por 100 mil escritas.
- Cotas gratuitas descontadas antes de calcular o excedente.

Os preços efetivos variam conforme a região do banco. Consultar os
[preços oficiais do Firebase](https://firebase.google.com/pricing) antes de
tomar decisões comerciais.

## Receita e custo estimado do Firestore

| Assinantes | Receita mensal | Usuários ativos estimados | Firestore/mês | Receita após Firestore |
| ---: | ---: | ---: | ---: | ---: |
| 100 | R$ 990 | 500 | R$ 4 a R$ 7 | R$ 983 a R$ 986 |
| 500 | R$ 4.950 | 2.500 | R$ 27 a R$ 54 | R$ 4.896 a R$ 4.923 |
| 1.000 | R$ 9.900 | 5.000 | R$ 57 a R$ 114 | R$ 9.786 a R$ 9.843 |
| 5.000 | R$ 49.500 | 25.000 | R$ 305 a R$ 610 | R$ 48.890 a R$ 49.195 |

Se somente assinantes Premium usarem a nuvem, 1.000 assinantes ativos devem
custar aproximadamente R$ 10 a R$ 25 por mês em Firestore, dentro das mesmas
premissas. O custo precisa ser validado com métricas reais após o lançamento.

## Exemplo de resultado operacional

Simulação com 1.000 assinantes, antes de publicidade, suporte e remuneração do
responsável pelo produto:

| Item | Valor estimado |
| --- | ---: |
| Receita bruta | R$ 9.900 |
| Meio de pagamento (hipótese de 5%) | -R$ 495 |
| Impostos (hipótese de 6%) | -R$ 594 |
| Firestore | -R$ 57 a -R$ 114 |
| Resultado estimado | **R$ 8.697 a R$ 8.754** |

As taxas e impostos acima são apenas hipóteses para planejamento. O resultado
real também deve descontar aquisição de clientes, atendimento, domínio,
hospedagem, reembolsos, comissões de lojas e o trabalho de manutenção.

## Métricas que devem ser acompanhadas

- Leituras, escritas, armazenamento e tráfego por dia no Firebase.
- Usuários ativos diários gratuitos e Premium.
- Leituras médias por usuário ativo.
- Conversão do gratuito para o Premium.
- Custo de aquisição por assinante.
- Cancelamentos e tempo médio de permanência.
- Receita líquida por assinante.

Configurar alertas de orçamento no Google Cloud antes de ativar o Blaze e
recalcular estas projeções usando pelo menos 30 dias de uso real.
