export type ChatMessage = { from: 'client' | 'bot' | 'human'; text: string; time: string }

export type Scenario = {
  id: string
  label: string
  contactName: string
  outcome: string
  messages: ChatMessage[]
}

export const heroConversation: ChatMessage[] = [
  { from: 'client', text: 'Oi! Vocês têm horário para limpeza de pele no sábado?', time: '23:41' },
  {
    from: 'bot',
    text: 'Oi, Juliana! Temos sim. No sábado há horários às 9h, 11h e 14h. Qual fica melhor para você?',
    time: '23:41',
  },
  { from: 'client', text: '11h! Quanto custa?', time: '23:42' },
  {
    from: 'bot',
    text: 'A limpeza de pele completa sai por R$ 180 e leva cerca de 1h. Posso reservar sábado às 11h no seu nome?',
    time: '23:42',
  },
]

export const scenarios: Scenario[] = [
  {
    id: 'compra',
    label: 'Compra',
    contactName: 'Rafael',
    outcome: 'Pedido encaminhado',
    messages: [
      { from: 'client', text: 'Boa tarde, o tênis Runner Pro tem no 42?', time: '14:03' },
      {
        from: 'bot',
        text: 'Tem sim, Rafael! No 42 temos nas cores preta e branca. Quer ver as fotos?',
        time: '14:03',
      },
      { from: 'client', text: 'Preto. Dá pra parcelar?', time: '14:04' },
      {
        from: 'bot',
        text: 'Dá sim: até 6x sem juros no cartão. Te envio o link do pedido com o preto 42?',
        time: '14:04',
      },
      { from: 'client', text: 'Manda!', time: '14:05' },
    ],
  },
  {
    id: 'informacao',
    label: 'Informação',
    contactName: 'Marina',
    outcome: 'Dúvida resolvida',
    messages: [
      { from: 'client', text: 'Vocês atendem por convênio?', time: '09:12' },
      {
        from: 'bot',
        text: 'Atendemos Unimed, Bradesco Saúde e SulAmérica, Marina. Qual é o seu?',
        time: '09:12',
      },
      { from: 'client', text: 'Unimed. Precisa de pedido médico?', time: '09:13' },
      {
        from: 'bot',
        text: 'Para consulta, não. Para exames, sim: basta trazer o pedido no dia. Quer que eu veja um horário?',
        time: '09:13',
      },
    ],
  },
  {
    id: 'agendamento',
    label: 'Agendamento',
    contactName: 'Paulo',
    outcome: 'Horário agendado',
    messages: [
      { from: 'client', text: 'Queria marcar um corte pra amanhã', time: '19:30' },
      {
        from: 'bot',
        text: 'Claro, Paulo! Amanhã temos 10h, 15h30 e 18h. Qual prefere?',
        time: '19:30',
      },
      { from: 'client', text: '18h', time: '19:31' },
      {
        from: 'bot',
        text: 'Combinado: corte amanhã às 18h no nome de Paulo. Até lá!',
        time: '19:31',
      },
    ],
  },
  {
    id: 'suporte',
    label: 'Suporte',
    contactName: 'Clara',
    outcome: 'Passado para a equipe',
    messages: [
      { from: 'client', text: 'Meu pedido 4821 chegou com defeito', time: '11:20' },
      {
        from: 'bot',
        text: 'Sinto muito, Clara. Vou passar seu caso para a Ana, da nossa equipe, que cuida da troca.',
        time: '11:20',
      },
      {
        from: 'human',
        text: 'Oi Clara, aqui é a Ana! Já separei um novo para envio hoje.',
        time: '11:22',
      },
    ],
  },
]

export const problems = [
  {
    title: 'Clientes esperando',
    text: 'Quem pergunta e não recebe resposta procura o concorrente.',
  },
  {
    title: 'Vendas perdidas',
    text: 'A demora no retorno esfria o interesse de quem já queria comprar.',
  },
  {
    title: 'Equipe sobrecarregada',
    text: 'As mesmas perguntas, respondidas dezenas de vezes por dia.',
  },
  {
    title: 'Conversas bagunçadas',
    text: 'Sem saber quem já foi atendido e quem ainda espera retorno.',
  },
  { title: 'Fora do horário', text: 'Mensagens da noite e do fim de semana ficam para depois.' },
  {
    title: 'Agenda no braço',
    text: 'Horários combinados mensagem por mensagem, com risco de erro.',
  },
  {
    title: 'Tudo depende de alguém',
    text: 'Se ninguém está disponível, o atendimento simplesmente para.',
  },
]

export const pillars = [
  {
    id: 'atendimento',
    title: 'Atendimento inteligente',
    text: 'Respostas automáticas que interpretam o que o cliente escreveu, no tom de voz da sua empresa.',
    points: [
      'Entende perguntas abertas',
      'Responde com as informações que você cadastrar',
      'Atende a qualquer hora',
    ],
  },
  {
    id: 'vendas',
    title: 'Vendas automatizadas',
    text: 'Apresenta produtos, tira dúvidas comerciais e conduz o interessado até a compra.',
    points: [
      'Informações de preço e condições',
      'Respostas no momento do interesse',
      'Encaminha para fechar o pedido',
    ],
  },
  {
    id: 'agendamentos',
    title: 'Agendamentos',
    text: 'Consulta a disponibilidade, apresenta os horários e realiza o agendamento direto na conversa.',
    points: [
      'Consulta de horários disponíveis',
      'Agendamento confirmado na conversa',
      'Agenda própria na página Agendamentos',
    ],
  },
  {
    id: 'gestao',
    title: 'Gestão de conversas',
    text: 'Todos os atendimentos em um só lugar, com a opção de um atendente assumir quando precisar.',
    points: ['Caixa de conversas única', 'Status de cada contato', 'Pausa da IA com um clique'],
  },
]

export const steps = [
  {
    title: 'O cliente chama no WhatsApp',
    text: 'No número que sua empresa já usa, a qualquer hora do dia.',
  },
  {
    title: 'A IA entende e responde',
    text: 'Interpreta a mensagem e responde com as informações da sua empresa.',
  },
  {
    title: 'O atendimento se resolve',
    text: 'Dúvida esclarecida, compra encaminhada ou horário combinado.',
  },
]

export const segments = [
  {
    id: 'clinicas',
    image: '/landing/segments/clinicas.jpg',
    imageAlt: 'Recepcionista de clínica sorrindo enquanto responde mensagens no celular',
    title: 'Clínicas e consultórios',
    focus: 'Agendamentos e informações',
    example:
      'Informa convênios aceitos, explica o preparo para exames e combina o horário da consulta.',
  },
  {
    id: 'lojas',
    image: '/landing/segments/lojas.jpg',
    imageAlt: 'Dona de loja de roupas dobrando peças ao lado de caixas para envio',
    title: 'Lojas e e-commerces',
    focus: 'Vendas e suporte',
    example: 'Responde sobre tamanhos, estoque e parcelamento, e envia o link do pedido.',
  },
  {
    id: 'restaurantes',
    image: '/landing/segments/restaurantes.jpg',
    imageAlt: 'Garçom arrumando a mesa em um restaurante aconchegante',
    title: 'Restaurantes',
    focus: 'Pedidos, reservas e cardápio',
    example: 'Envia o cardápio do dia, anota o pedido e reserva a mesa para o jantar.',
  },
  {
    id: 'servicos',
    image: '/landing/segments/servicos.jpg',
    imageAlt: 'Eletricista conferindo o celular antes de começar um serviço',
    title: 'Prestadores de serviços',
    focus: 'Orçamentos e agendamentos',
    example: 'Coleta os detalhes do serviço, organiza o pedido de orçamento e agenda a visita.',
  },
  {
    id: 'imobiliarias',
    image: '/landing/segments/imobiliarias.jpg',
    imageAlt: 'Corretora com as chaves de um apartamento iluminado',
    title: 'Imobiliárias',
    focus: 'Qualificação de interessados',
    example:
      'Pergunta região, faixa de valor e tipo de imóvel antes de passar o contato ao corretor.',
  },
  {
    id: 'empresas',
    image: '/landing/segments/empresas.jpg',
    imageAlt: 'Atendente de escritório respondendo clientes pelo celular',
    title: 'Empresas em geral',
    focus: 'Atendimento, relacionamento e vendas',
    example: 'Responde dúvidas frequentes e encaminha cada assunto para a pessoa certa.',
  },
]

export const differentials = [
  'Inteligência artificial aplicada ao atendimento',
  'Automação de processos comerciais',
  'Atendimento e vendas no mesmo ambiente',
  'Respostas personalizadas para a sua empresa',
  'Gerenciamento de conversas',
  'Atendimento humano quando necessário',
  'Gestão centralizada',
  'Menos tarefas manuais para a equipe',
  'Melhor experiência para quem chama sua empresa',
]

export const comparison: { topic: string; traditional: string; automated: string }[] = [
  { topic: 'Horário', traditional: 'Só no expediente', automated: '24 horas, todos os dias' },
  { topic: 'Primeira resposta', traditional: 'Depende da fila', automated: 'Imediata' },
  {
    topic: 'Perguntas repetidas',
    traditional: 'Respondidas uma a uma',
    automated: 'Respondidas automaticamente',
  },
  {
    topic: 'Organização',
    traditional: 'Conversas espalhadas',
    automated: 'Tudo em uma caixa única',
  },
  {
    topic: 'Casos complexos',
    traditional: 'Equipe já sobrecarregada',
    automated: 'Equipe livre para assumir',
  },
  {
    topic: 'Escala',
    traditional: 'Mais volume, mais contratações',
    automated: 'Mais volume, mesma estrutura',
  },
]

export const faqs = [
  {
    q: 'O chatbot funciona 24 horas por dia?',
    a: 'Sim. Depois de conectado, ele responde as mensagens recebidas no seu WhatsApp a qualquer hora, inclusive à noite, em fins de semana e feriados.',
  },
  {
    q: 'Preciso ter conhecimento técnico para utilizar a plataforma?',
    a: 'Não. A conexão é feita lendo um QR Code, e as instruções da recepcionista são escritas em linguagem natural, como você explicaria para um novo funcionário.',
  },
  {
    q: 'O chatbot consegue responder perguntas personalizadas?',
    a: 'Sim. Ele interpreta perguntas abertas e responde com base nas informações e instruções que você cadastrar sobre sua empresa, seus produtos e serviços.',
  },
  {
    q: 'Ele consegue realizar vendas?',
    a: 'Ele apresenta produtos, informa preços e condições que você cadastrar, tira dúvidas e conduz o cliente até a compra, como o envio do link de pagamento ou o encaminhamento para a equipe fechar o pedido.',
  },
  {
    q: 'É possível realizar agendamentos?',
    a: 'Sim. A IA consulta os horários disponíveis, apresenta as opções e confirma o agendamento na conversa. Tudo fica registrado na página Agendamentos da sua área do cliente, quando o agendamento faz parte da sua configuração.',
  },
  {
    q: 'Posso assumir uma conversa manualmente?',
    a: 'Sim. Na caixa de conversas você pausa a IA de um contato e continua o atendimento pessoalmente, quando quiser.',
  },
  {
    q: 'Posso personalizar as respostas?',
    a: 'Sim. Você define as instruções, o tom de voz e as informações que a recepcionista usa para responder.',
  },
  {
    q: 'Como funciona a conexão com o WhatsApp?',
    a: 'Você conecta o número da sua empresa lendo um QR Code dentro da plataforma, do mesmo jeito que conecta o WhatsApp Web.',
  },
  {
    q: 'Posso cancelar minha assinatura?',
    a: 'Sim. As condições de cancelamento são apresentadas de forma clara na contratação de cada plano.',
  },
  {
    q: 'Como começo a utilizar a plataforma?',
    a: 'Faça o diagnóstico gratuito: em poucos minutos você recebe uma recomendação para sua empresa, e nossa equipe acompanha a ativação da sua conta.',
  },
]
