# PRD — Extensão para Análise de Oportunidades de Skins CS2

**Status:** Draft  
**Prioridade:** Alta  
**Objetivo:** MVP funcional para uso pessoal  
**Prazo desejado:** Primeira versão utilizável em 1–2 dias

---

## 1. Visão geral

Desenvolver uma extensão de navegador que permita analisar individualmente anúncios de skins de CS2 em marketplaces, comparando o preço de compra com dados de mercado do CSFloat.

A ferramenta deve ajudar a identificar oportunidades de arbitragem, reduzir o trabalho manual de pesquisa e evitar compras baseadas em referências de preços incorretas ou inflacionadas.

O usuário continuará navegando pelos marketplaces normalmente e identificando visualmente possíveis oportunidades. A extensão será responsável exclusivamente pela análise e validação dessas oportunidades.

**Princípio fundamental:** nenhuma consulta automática durante a navegação. Todas as análises devem ser iniciadas explicitamente pelo usuário.

## 2. Problema

Atualmente, encontrar oportunidades exige:

1. Navegar por centenas de anúncios em diferentes marketplaces.
2. Identificar visualmente skins potencialmente subvalorizadas.
3. Abrir o CSFloat em outra aba.
4. Procurar manualmente a mesma skin.
5. Comparar preços de anúncios ativos.
6. Consultar vendas recentes.
7. Verificar ordens de compra (Buy Orders).
8. Calcular taxas, custos e rentabilidade.
9. Decidir se a oportunidade realmente vale a pena.

Esse processo é demorado e sujeito a erros.

O objetivo é transformar essa validação em uma operação rápida, realizada diretamente no anúncio original.

## 3. Objetivos do produto

- Permitir analisar uma skin sem sair do marketplace.
- Consultar informações relevantes do CSFloat.
- Identificar preços de mercado potencialmente inflacionados.
- Comparar anúncios, vendas realizadas e ordens de compra.
- Estimar o valor líquido de uma possível revenda.
- Calcular lucro e ROI considerando taxas e custos.
- Reduzir consultas desnecessárias às fontes externas.
- Facilitar a identificação de oportunidades reais de arbitragem.

## 4. Escopo do MVP

### 4.1. Marketplaces de origem

A primeira versão deverá funcionar nos seguintes sites:

- DashSkins.gg
- DashSkins.com.br
- RentSkins.com.br

A implementação deve permitir adicionar novos marketplaces posteriormente sem precisar reconstruir toda a lógica de análise.

### 4.2. Integração com CSFloat

O CSFloat será a principal fonte de referência para a primeira versão.

Investigar e implementar, conforme disponibilidade e permissões das interfaces de dados:

- Anúncios ativos.
- Histórico de vendas.
- Preços de vendas recentes.
- Ordens de compra (Buy Orders).
- Ordens de compra compatíveis com as características da skin.
- Float e demais características relevantes.
- Informações necessárias para estimar o preço de saída.

Priorizar interfaces oficiais e documentadas.

Caso alguma informação não esteja disponível oficialmente, avaliar alternativas tecnicamente viáveis, respeitando limitações, autenticação e políticas do serviço.

Não assumir que todos os dados estarão disponíveis pela mesma API.

### 4.3. Botão de análise

Cada anúncio de skin deverá apresentar um botão ou controle de análise.

Exemplo:

`[ Analisar no SkinRadar ]`

O botão deve:

- Ser integrado visualmente ao card do anúncio.
- Permitir iniciar uma análise individual.
- Identificar corretamente a skin associada ao card.
- Capturar o preço atual de compra.
- Capturar o nome, exterior e características disponíveis.
- Capturar float, stickers e pattern quando disponíveis.
- Exibir estado de carregamento.
- Impedir consultas duplicadas acidentais durante uma análise em andamento.

O botão deve funcionar independentemente para cada anúncio.

### 4.4. Análise sob demanda

O sistema NÃO deverá consultar automaticamente os marketplaces externos durante:

- Carregamento da página.
- Rolagem.
- Exibição de novos anúncios.
- Atualização de elementos visuais.
- Navegação entre páginas.

As consultas externas somente devem acontecer após uma ação explícita do usuário.

Isso é essencial para controlar consumo de API, evitar rate limits e reduzir tráfego desnecessário.

## 5. Interface de análise

Ao clicar no botão, apresentar um painel de análise sem exigir que o usuário abra outra página.

O painel deverá conter:

### 5.1. Identificação da skin

- Nome completo.
- Exterior.
- Float, quando disponível.
- Pattern, quando relevante.
- Stickers, quando disponíveis.
- Marketplace de origem.
- Preço de compra.

### 5.2. Mercado CSFloat

Exibir, quando disponíveis:

- Menor preço de anúncio ativo.
- Mediana ou referência central dos anúncios ativos.
- Histórico de vendas recentes.
- Preço médio das vendas recentes.
- Mediana das vendas recentes.
- Quantidade de vendas consideradas.
- Data e horário das vendas.
- Maior preço de venda recente.
- Menor preço de venda recente.

Não utilizar apenas o menor anúncio como referência de revenda.

O sistema deve deixar explícito quando a quantidade de dados for insuficiente.

### 5.3. Buy Orders

Esta é uma funcionalidade de alta prioridade.

Consultar as ordens de compra disponíveis e apresentar:

- Maior Buy Order compatível.
- Preço da ordem.
- Quantidade disponível, quando fornecida.
- Características e restrições da ordem.
- Quantidade de ordens relevantes.
- Diferença entre a maior Buy Order e o preço de compra.

Diferenciar ordens genéricas de ordens com requisitos específicos.

Uma ordem de compra não deve ser considerada uma saída garantida. Deve ser apresentada como uma alternativa potencial de liquidez.

### 5.4. Avaliação de preço

O sistema deve comparar três referências independentes:

1. Preço dos anúncios ativos.
2. Preços efetivamente realizados nas vendas.
3. Preços das ordens de compra.

O objetivo é identificar quando o mercado está artificialmente valorizado em relação às vendas efetivas.

Exemplo:

| Indicador | Valor ilustrativo |
|---|---:|
| Menor anúncio ativo | US$ 100 |
| Mediana das vendas | US$ 85 |
| Maior Buy Order | US$ 78 |
| Preço de compra | US$ 70 |

Nesse cenário, o sistema não deve considerar US$ 100 como preço realista de revenda.

### 5.5. Resultado financeiro

Calcular:

- Preço de compra.
- Preço de revenda estimado.
- Taxa de venda.
- Outros custos configuráveis.
- Lucro líquido estimado.
- ROI percentual.

Fórmulas:

`Lucro líquido = Venda estimada - Taxas - Custos - Compra`

`ROI = (Lucro líquido / Compra) × 100`

Permitir configurar taxas e custos.

O sistema deve distinguir claramente:

- Revenda pelo preço estimado de mercado.
- Revenda pelo menor anúncio ativo.
- Venda potencial através de Buy Order.

Não misturar essas modalidades em uma única estimativa.

## 6. Sistema de avaliação de oportunidades

Apresentar um resultado visual e fácil de interpretar.

Possíveis classificações:

- Oportunidade interessante.
- Oportunidade moderada.
- Margem insuficiente.
- Preço de referência inflacionado.
- Baixa liquidez.
- Dados insuficientes.

A classificação deverá considerar:

- Lucro líquido.
- ROI.
- Diferença entre compra e vendas recentes.
- Buy Orders.
- Liquidez.
- Quantidade e qualidade dos dados.
- Características específicas da skin.

As margens mínimas deverão ser configuráveis.

Não classificar uma oportunidade como boa exclusivamente porque o preço de compra está abaixo do menor anúncio ativo.

## 7. Configurações

Disponibilizar configurações locais para:

- Taxa de venda.
- Custos adicionais.
- Margem mínima desejada.
- Moeda de referência.
- Tempo de validade do cache.
- Preferência de referência de preço.

As taxas devem ser configuráveis porque podem mudar.

## 8. Cache e otimização

Para evitar consultas repetidas:

- Implementar cache de resultados.
- Reutilizar análises recentes da mesma skin.
- Permitir atualizar manualmente os dados.
- Evitar consultas simultâneas duplicadas.
- Respeitar limites de requisição das fontes.
- Exibir quando os dados foram atualizados pela última vez.

O cache deve considerar as características relevantes da skin.

Não reutilizar indiscriminadamente a análise de uma skin com float ou pattern diferente quando essas características influenciarem o preço.

## 9. Tratamento de erros

O sistema deverá tratar:

- API indisponível.
- Rate limit.
- Falha de autenticação.
- Skin não encontrada.
- Correspondência ambígua entre itens.
- Histórico insuficiente.
- Buy Orders indisponíveis.
- Dados incompletos.
- Falha de identificação do anúncio.

Quando uma informação não estiver disponível, exibir isso claramente.

Não inventar valores nem preencher informações ausentes com estimativas silenciosas.

A análise deverá continuar funcionando parcialmente quando uma das fontes falhar.

## 10. Segurança e privacidade

- Não armazenar credenciais diretamente no código.
- Não expor chaves de API em repositórios públicos.
- Manter configurações e credenciais locais.
- Não realizar compras automáticas.
- Não executar ações em contas dos marketplaces sem autorização.
- Respeitar políticas e limites de acesso das plataformas.

O projeto será inicialmente de uso pessoal.

## 11. Fora do escopo do MVP

Não implementar inicialmente:

- Scanner automático de páginas.
- Monitoramento contínuo de marketplaces.
- Alertas em tempo real.
- Compra automática.
- Venda automática.
- Dashboard externo.
- Backend próprio.
- Banco de dados centralizado.
- Sistema de contas e usuários.
- Histórico persistente de todas as análises.
- Integração com dezenas de marketplaces.
- Inteligência artificial para avaliação de skins.

Essas funcionalidades poderão ser consideradas posteriormente.

## 12. Arquitetura conceitual

Separar responsabilidades para facilitar a expansão:

- Integração com marketplaces de origem.
- Identificação e normalização de skins.
- Integração com fontes de preços.
- Coleta de anúncios e vendas.
- Coleta de Buy Orders.
- Motor de cálculo financeiro.
- Sistema de classificação de oportunidades.
- Interface de análise.
- Cache e configurações.

Cada marketplace deverá possuir uma camada de integração independente.

A lógica de comparação e rentabilidade não deve depender de um marketplace específico.

## 13. Critérios de aceitação

O MVP será considerado funcional quando:

1. A extensão conseguir identificar anúncios nos marketplaces definidos.
2. Cada anúncio apresentar um botão de análise.
3. O botão conseguir identificar corretamente a skin e seu preço.
4. A análise acontecer somente após clique.
5. A extensão conseguir consultar informações do CSFloat.
6. Os anúncios ativos forem apresentados separadamente das vendas realizadas.
7. As Buy Orders forem consultadas quando disponíveis.
8. O sistema calcular lucro líquido e ROI.
9. O sistema identificar referências de preço potencialmente inflacionadas.
10. O sistema apresentar informações incompletas sem inventar dados.
11. O cache reduzir consultas repetidas.
12. O usuário conseguir visualizar a análise sem sair da página original.

## 14. Estratégia de implementação

Priorizar uma implementação incremental.

### Fase 1 — Prova de viabilidade

- Investigar as interfaces de dados do CSFloat.
- Verificar disponibilidade de anúncios, vendas e Buy Orders.
- Validar a identificação de skins.
- Identificar a estrutura dos anúncios nos marketplaces.
- Fazer uma primeira consulta real a partir de um anúncio.

**Resultado esperado:** conseguir analisar uma skin real de ponta a ponta.

### Fase 2 — MVP funcional

- Implementar integração com os marketplaces.
- Adicionar botão de análise.
- Implementar consulta ao CSFloat.
- Implementar painel de resultados.
- Implementar cálculo de rentabilidade.
- Implementar cache.

**Resultado esperado:** conseguir utilizar a ferramenta durante o garimpo normal de skins.

### Fase 3 — Refinamento

- Melhorar identificação de skins.
- Refinar correspondência por float e características.
- Melhorar análise de liquidez.
- Refinar classificação de oportunidades.
- Corrigir problemas de interface e compatibilidade.

## 15. Diretriz de desenvolvimento

A prioridade absoluta é entregar uma ferramenta funcional rapidamente.

Não antecipar funcionalidades futuras.

Não construir infraestrutura desnecessária.

Não implementar integrações complexas antes de validar a viabilidade dos dados.

Sempre priorizar uma consulta correta e confiável em vez de apresentar muitos indicadores com baixa qualidade.

**A primeira entrega deve resolver um único problema muito bem: permitir que o usuário clique em um anúncio aparentemente interessante e descubra rapidamente se realmente existe uma oportunidade de arbitragem.**
