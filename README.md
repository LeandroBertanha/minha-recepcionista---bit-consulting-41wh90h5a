# BitZaap

Plataforma da Bit Consulting para centralizar atendimentos, organizar oportunidades e automatizar conversas no WhatsApp com inteligência artificial.

- versão `0.0.42` publicada em produção no SKIP;
- conexão de WhatsApp de produção validada com envio e recebimento;
- novo domínio aguardando emissão do certificado, sem bloquear a operação no domínio atual.

O acompanhamento das próximas entregas está em [`ROADMAP.md`](ROADMAP.md). O teste manual de
uma conta adicional foi retirado do roadmap atual; a cobertura automatizada de isolamento entre
usuários permanece obrigatória.

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## 📋 Pré-requisitos

- Node.js 18+
- npm

## 🔧 Instalação

```bash
npm install
```

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

Para criar uma build otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/` e estarão prontos para deploy.

## 🔐 Integração com a Evolution API

Configure os valores abaixo somente no gerenciador de segredos do Skip. Eles não devem ser
incluídos no código ou enviados ao GitHub:

- `EVOLUTION_API_URL`: URL HTTPS da instalação da Evolution API.
- `EVOLUTION_API_KEY`: chave global utilizada pelo backend para administrar as instâncias.
- `APP_WEBHOOK_URL`: URL pública do backend da BitZaap, sem barra no final.
- `EVOLUTION_WEBHOOK_SECRET`: valor aleatório usado no cabeçalho
  `X-Bitzaap-Webhook-Secret` para autenticar os webhooks.

O endpoint autenticado `GET /backend/v1/integration/status` informa apenas se cada item foi
configurado; nenhum segredo ou endereço é retornado ao navegador. O envio e a desconexão falham de
forma segura quando a Evolution API não está disponível, evitando exibir mensagens como enviadas
sem confirmação do provedor.

Falhas de envio recebem um identificador de correlação `evo_*` no retorno e nos logs. O log registra
somente instância interna, tipo, status e uma categoria normalizada do erro; conteúdo da conversa,
telefone, chave e segredo não são registrados. O cron `whatsapp_connection_health` informa a cada
15 minutos apenas conexões que permanecem fora do estado `connected` por mais de 10 minutos.

O procedimento operacional está em [`docs/OPERACAO.md`](docs/OPERACAO.md).

### Hospedagem gratuita da Evolution API

A configuração reproduzível para executar a integração em uma VM Oracle Cloud Always Free está em
[`infra/evolution`](infra/evolution/README.md). Ela inclui Evolution API, PostgreSQL, Redis, HTTPS
automático e armazenamento persistente, sem publicar banco ou cache diretamente na internet.

Como alternativa de homologação sem custo e sem servidor em nuvem, o guia
[`Execução gratuita no Mac`](infra/evolution/LOCAL-MAC.md) utiliza Podman Desktop e um domínio HTTPS
gratuito do ngrok.
