# Elo Digital

Elo Digital é uma iniciativa de projeto (startup) que irá fornecer uma ampla gama de produtos e serviços digitais.

## Como usar este documento

- Este documento é a fonte de verdade do projeto. Quando algo não estiver aqui, **não invente**: pergunte ou registre como decisão pendente.
- Prioridades: **P0** (sem isso não há MVP), **P1** (logo depois, antes do piloto), **P2** (importante, mas pode esperar).
- Nunca afirme que algo foi testado, executado ou implantado sem que isso tenha ocorrido.

## Especificação técnica

Elo Digital deve ser um monorepo, onde as aplicações devem ser organizadas individualmente e possuirem cada uma sua própria lógica. Dados repetitivos que devem ser reutilizados entre diferentes sistemas devem ser integrados dentro de um package. O núcleo principal (`core`) deve possuir as informações mais relevantes para todo o projeto, como dados de validação, API types, métodos utilitários, entre outros, qualquer tipo de dado/utilitário que possa/deva ser reutilizado. Também poderão existir outros pacotes, tudo dependerá da necessidade do monorepo.
A aplicação deve seguir os seguintes princípios: simplicidade, baixo custo operacional, segurança desde o início, validação de entrada em todas as rotas, tratamento de erros, testes nos fluxos críticos e variáveis de ambiente para segredos. Não usar microsserviços nem infraestrutura complexa sem necessidade demonstrável.
Como gerenciador de pacotes do Node.js, utilize o PNPM, que se destaca pela sua velocidade e eficiência.

### Stack

O projeto Elo Digital, por ser um monorepo, deve utilizar Turborepo para gerenciar as aplicações existentes durante desenvolvimento e execução em produção. Todas as aplicações devem ser construídas com TypeScript, sendo a linguagem principal dos sistemas como um todo. Outras linguagens podem ser usadas em casos específicos, como Python em casos de scripts, os scripts shell.
Para formatação de código, utilize a ferramenta Prettier configurada no root do projeto, para manter sempre o mesmo padrão na codebase. Além disso, configure o Eslint para previnir problemas extras.

#### Servidores

Os servidores devem ser implementados utilizando Nest.js como motor principal, permitindo o uso de todo o potencial do TypeScript a partir de decoradores, tipagem estática e interfaces plug and play. Como banco de dados, PostgreSQL deve ser a escolha, sendo utilizado em conjunto do TypeORM para se integrar ao Nest.js. Lembre-se de manter as convenções de nomenclatura nas entidades do banco.

- **Validação de entrada:** `class-validator` + `class-transformer` em todos os DTOs, em toda rota que receber dados externos (inclusive as públicas, como o cardápio por token de mesa).
- **Migrations:** uso obrigatório de migrations versionadas do TypeORM. `synchronize` deve ficar desligado em qualquer ambiente que não seja local.
- **Autenticação e permissões:** JWT para sessões autenticadas (dashboard, garçom, cozinha, caixa). Para o acesso por mesa (cliente), sessão própria via cookie, vinculada ao token da mesa, com validade curta — não deve usar o mesmo mecanismo de autenticação dos usuários internos. Controle de acesso por perfil (RBAC) a nível de rota/guard, respeitando os perfis definidos (superadmin, administrador Elo Digital, administrador restaurante, garçom, cozinha).
- **Isolamento multi-tenant:** toda entidade ligada a um restaurante carrega seu identificador, e toda query no servidor é filtrada por ele — nunca confiar em filtro feito no client.
- **Tempo real:** pedidos e status da cozinha precisam refletir em tempo real (cliente acompanhando pedido, tela da cozinha, chamados ao garçom). Usar WebSockets (suporte nativo do Nest via `@nestjs/websockets`) para esses fluxos.
- **Rate limiting:** aplicar limite de requisições por sessão/IP, principalmente nas rotas públicas do cardápio por mesa, usando `@nestjs/throttler`.
- **Testes:** Jest (padrão do Nest) para os fluxos críticos — abertura/fechamento de mesa, envio de comanda, cancelamento, cálculo da conta.
- **Documentação da API:** Swagger via `@nestjs/swagger`, mantido atualizado conforme os endpoints forem criados.

## Aplicações visuais

### Evitando AI-slop

- Nada de gradiente roxo-azul genérico, emoji como ícone, ou sombra pesada por padrão.
- Ícones: `lucide-react`. Componentes base: `shadcn/ui` (Radix + Tailwind), copiados para o projeto e não instalados como dependência fechada.
- Cores, espaçamento e tipografia sempre via tokens do tema, nunca valores soltos no componente.
- Antes de criar um componente novo, checar se já existe algo equivalente no `core` ou no design system.

### Estilo visual: liquid glass

A interface deve usar efeito **liquid glass** (vidro translúcido, blur, bordas suaves) como identidade visual, mas de forma leve:

- `backdrop-filter: blur()` com valores moderados (8–16px) — evitar blur pesado que pesa no rendering, especialmente em listas/scroll.
- Transparência sutil (`bg-white/10`, `bg-black/20`, etc.) sobre fundo com profundidade, não em todo elemento da tela — usar com intenção (cards, modais, navbar), não em texto ou áreas grandes de conteúdo.
- Borda fina semi-transparente para reforçar o "vidro" sem precisar de sombra forte.
- Evitar empilhar blur em camadas (elemento com blur sobre outro com blur) — isso é o principal vilão de performance desse efeito.

### Tema

A definição final da paleta e dos tokens fica a critério da IA no momento da construção, mas deve seguir o princípio de **centralização**: todas as cores/variáveis agrupadas em um único arquivo de tema, nunca espalhadas como valores soltos nos componentes — para que qualquer ajuste futuro de paleta seja feito em um só lugar.

## Elo Digital - Elo Cardápio

Elo Cardápio será um projeto de cardápio virtual, que irá fornecer um serviço que permita os restaurantes atenderem de forma virtual a partir de um catálogo de produtos (comidas, bebidas, etc.) registrados pelo próprio restaurante. Esse sistema irá fornecer auxílio no processo realizado pelos garçons, tendo em vista que o objetivo seria garantir uma maior facilidade na realização de pedidos e no envio para a cozinha, permitindo realizar todo o pedido diretamente pelo site, além de fazer chamados para o garçom em casos em que o cliente deseje atendimento direto.

O sistema funcionará por assinatura, com gerenciamento manual dos pagamentos pela administração da Elo Digital. Caso o pagamento mensal não seja confirmado, o acesso do restaurante será suspenso.

Público-alvo: restaurantes, pizzarias, hamburguerias e pastelarias.

### Perfis de usuário do restaurante

| Perfil | O que acessa |
|---|---|
| Administrador do restaurante | Dashboard completo do seu próprio restaurante, com tudo o que é disponibilizado nele |
| Garçom | Mesas, sessões, chamados do garçom e pedidos de validação (abertura e fechamento de mesa) |
| Cozinha | Comandas enviadas à cozinha, em tela própria, divididas em cards com o nome da mesa no canto superior direito |
| Caixa | Cálculo das contas das comandas de cada mesa, com capacidade de recalcular o que cada mesa pediu |

O administrador da plataforma Elo Digital acessa o dashboard completo descrito abaixo.

### Dashboard do Elo Cardápio

Destinado à administração geral da plataforma, permitindo:

- Visão geral: resumo dos restaurantes cadastrados, assinaturas ativas e pagamentos pendentes.
- Restaurantes: cadastro, consulta e gerenciamento dos estabelecimentos, além de acesso aos dados registrados.
- Assinaturas e pagamentos: gerenciamento do plano, vencimentos, registro manual de pagamentos e histórico das cobranças.
- Controle de acesso: suspensão e reativação de restaurantes conforme a situação dos pagamentos.
- Configurações: gerenciamento dos administradores e das configurações gerais da plataforma. Deve ser possível definir a equipe que irá gerenciar o projeto a partir do cargo de superadmin, que será possível de acessar utilizando uma key gerada aleatoriamente e ficará armazenada nas variáveis de ambiente. Um sistema de permissôes deve ser implementado ao dashboard, permitindo que a depender das configurações, diferentes usuários tenham diferentes formas de acessar e gerenciar partes da aplicação.
- Acesso ao painel: acesso como superadmin ou como integrante da equipe usando nomes de usuário + senhas definidas durante registro pelo superadmin.

### Dashboard Restaurante

Destinado ao gerenciamento das operações do estabelecimento, permitindo:

- Visão geral: resumo dos pedidos, chamados de atendimento e principais indicadores.
- Cardápio: cadastro e gerenciamento de categorias, produtos, preços, imagens e disponibilidade.
- Pedidos e cozinha: acompanhamento dos pedidos recebidos e atualização de seus estados até a entrega.
- Mesas e chamados: gerenciamento das mesas, geração de QR Codes e atendimento às solicitações dos clientes.
- Relatórios: consulta de vendas, quantidade de pedidos e produtos mais vendidos.
- Configurações: gerenciamento dos dados do estabelecimento, usuários e permissões.
- Assinatura: consulta do plano contratado, vencimento e situação do acesso.

O acesso a diferentes partes do sistema irá depender do nível de permissão do usuário. E o acesso às funcionalidades do dashboard do restaurante pelo estabelecimento dependerá da situação da assinatura, sendo suspenso quando o pagamento não for confirmado.

### Assinatura e cobrança

- Plano único no início.
- Tolerância de **7 dias** após o vencimento. Durante a tolerância o sistema funciona normalmente, com aviso ao restaurante para regularizar o pagamento; após esse prazo, o acesso é suspenso.
- O aviso de vencimento aparece no dashboard do restaurante.
- Com o acesso suspenso, o sistema deve bloquear acesso por parte dos funcionários. O cardápio virtual pode se manter ativo.

### Descrição: acesso ao cardápio

O sistema de cardápio digital será acessível de duas formas distintas: diretamente por um link fixo de acesso ao cardápio do restaurante, ou por um link com um token específico que irá identificar mesas do restaurante.

Sobre o link com token específico: esses links seriam disponibilizados em suportes personalizados feitos com impressão 3D para identificar as mesas, sendo fornecidos aos restaurantes que contratassem o serviço. Os links serão gravados em uma tag NFC e em um QR Code presentes em cada suporte, servindo para identificar as mesas respectivas ao serem enviados pedidos para a cozinha ou chamados para o garçom. A equipe da Elo Digital fará a instalação dos suportes nos restaurantes.

**Formato da URL por mesa:** `https://<domínio>/<nome-do-restaurante>/<token-da-mesa>`

- O restaurante é identificado por um nome curto (slug) no caminho da URL.
- O token da mesa é um valor **aleatório alfanumérico e longo**, gerado pelo servidor e guardado no banco ligado àquela mesa. O número da mesa não aparece como identificador na URL. Token inválido leva a uma página de erro.
- O token impresso na tag e no QR Code é permanente. Só é regravado se a equipe suspeitar de abuso daquela mesa.
- Tags NFC devem ser gravadas e depois travadas contra regravação.
- As mesas devem ser possiveis de configurar dentro do painel do restaurante. Ao serem criadas, um token permanente é associado àquela mesa em específico, e só poderá ser regravada por administradores do sistema Elo Digital com permissão para isso.

**Link fixo (sem mesa):** no MVP o link fixo mostra o cardápio e o sistema junto com ele, e não apenas o cardápio. Quando o acesso ocorre pelo link fixo, o cardápio será apenas para consulta.

### Fluxo principal do cliente e da mesa

1. O cliente escaneia o QR Code ou encosta o celular na tag NFC e abre o cardápio do restaurante, já identificado pela mesa.
2. O cliente escolhe os itens com detalhamento (observações, adicionais, tamanhos e outras opções; a estrutura exata das opções é definida pelo restaurante) e monta o pedido.
3. Ao terminar de escolher, aparece o botão **"Abrir mesa"**. O garçom recebe um **pedido de validação** em seu painel e valida a abertura.
4. Depois da validação, o botão se transforma em **"Enviar comanda"**. Ao enviar, o pedido vai para a tela da cozinha.
5. O cliente acompanha o preparo em tempo real.
6. O cliente pode chamar o garçom a qualquer momento pelo botão de chamado.
7. Para encerrar, o cliente solicita o fechamento da conta. **Somente o garçom** pode fechar a mesa, validando a requisição do cliente. Quando o garçom encerra a mesa, a **sessão do cliente também é encerrada**.

### Sessão e segurança do acesso por mesa

- Ao abrir a URL, o servidor cria uma **sessão** associada àquela mesa, guardada em cookie, com validade limitada (ordem de poucas horas) e encerrada também quando o garçom fecha a mesa. Para uma nova refeição, o cliente escaneia a placa de novo; a tag nunca precisa ser regravada por causa de sessão.
- O token da mesa sozinho nunca basta para enviar pedidos: o envio da comanda depende de a mesa ter sido aberta e validada pelo garçom. Assim, um token salvo ou fotografado não permite pedir de outra mesa ou fora do horário.
- Aplicar limite de requisições por sessão e por IP, validar todas as entradas e checar sempre no servidor que a sessão pertence à mesa e ao restaurante.
- Vários celulares na mesma mesa (todos compartilham a mesma comanda ou cada pessoa tem a sua): comanda única por mesa, porque a abertura e o fechamento já são por mesa. Bloqueia outras tentativas de acesso.

### Pedidos e cozinha

- A cozinha usa uma tela própria (pensada para TV), com os pedidos em **cards** por ordem de chegada, com o nome da mesa no canto superior direito (exemplo: "Mesa 01").
- Quem muda o status do pedido é a própria cozinha (o cozinheiro).
- O cliente acompanha o status em tempo real. Estados previstos: enviado, recebido, em preparo e pronto.

#### Cancelamento

- O cliente pode cancelar apenas **antes de o preparo ser iniciado** pela cozinha. Motivo do cancelamento é opcional.
- O **garçom** pode cancelar enquanto o status for "em preparo" (antes de "pronto"), apenas nas mesas que atende, com motivo obrigatório.
- O **administrador** pode cancelar em qualquer status, com motivo obrigatório.
- Cancelamento após "pronto" não é permitido, o tratamento deve ser com status separado (ex.: "recusado"/"devolvido").
- Cancelamento com pedido "em preparo" deve notificar a cozinha (alerta visual no card).

#### Chamados ao garçom

- Aparecem em lista no painel do garçom.
- A planta do estabelecimento com localização exata das mesas **não** faz parte do escopo.

### Conta e caixa

- O sistema calcula automaticamente o valor total da despesa da mesa.
- Garçom ou caixa podem ajustar a conta. O caixa pode recalcular o que cada mesa pediu.
- **Taxa de serviço:** configurável, e tecnicamente recusável pelo cliente. O garçom pode remover a taxa caso ocorra alguma situação que exija isso.
- **Divisão de conta:** suporta divisão por pessoa (igualmente entre N pessoas) e por item (cada um paga o que consumiu).
- **Forma de pagamento:** fora do escopo do sistema. A decisão é do cliente, e o garçom atende presencialmente.
- **Fechamento de mesa:** feito pelo garçom, responsável por confirmar a finalização.
- No MVP o sistema **não** processa pagamento; a integração com um sistema financeiro de pagamentos é uma evolução futura, **fora do escopo agora**.

### Dados pessoais (LGPD)

- Coletar apenas o **nome e o contato do gerente** de cada restaurante.
- Os **clientes finais não precisam informar nome nem telefone**. Não coletar dados pessoais deles sem necessidade.
- Nunca expor chaves, senhas ou dados de restaurantes de forma indevida; um restaurante não pode ver dados de outro.
- Multi-restaurante e isolamento de dados: todas as tabelas de dados de restaurante levam o identificador do restaurante, e toda consulta é filtrada por ele no servidor.

## Prioridades do MVP

**P0 (sem isso não há MVP)**
- Restaurantes, usuários e perfis (administrador, garçom, cozinha, caixa).
- Cadastro de cardápio (categorias, produtos, preços, disponibilidade).
- Cardápio público por token da mesa, com pedido detalhado.
- Abertura de mesa validada pelo garçom.
- Tela da cozinha em tempo real, com mudança de status.
- Chamar garçom, em lista.
- Sessão da mesa e fechamento pelo garçom.
- Assinatura manual, tolerância de 7 dias e suspensão.
- Geração de QR Code por mesa.

**P1 (logo depois, antes do piloto)**
- Acompanhamento do pedido pelo cliente em tempo real.
- Cancelamento pelo cliente até o início do preparo.
- Caixa com cálculo e recálculo da conta.
- Aviso de vencimento no dashboard do restaurante.

**P2**
- Relatórios (vendas, quantidade de pedidos, produtos mais vendidos).
- Imagens otimizadas.
- Aviso de cobrança por WhatsApp.
