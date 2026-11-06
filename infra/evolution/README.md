# Evolution API gratuita para a BitZaap

Esta configuração executa a Evolution API, PostgreSQL, Redis e Caddy em uma única VM. Ela foi
preparada para uma VM Oracle Cloud **Always Free** com Ubuntu e arquitetura ARM64.

Se o cadastro da Oracle não estiver disponível, consulte o modo alternativo gratuito em
[`LOCAL-MAC.md`](LOCAL-MAC.md). Ele executa os mesmos serviços no Mac e publica a API por um túnel
HTTPS do ngrok.

## Arquitetura

- Apenas as portas `80` e `443` ficam públicas.
- PostgreSQL, Redis e Evolution API permanecem na rede interna do Docker.
- O Caddy emite e renova automaticamente o certificado HTTPS.
- Banco, cache, credenciais do WhatsApp e certificados usam volumes persistentes.
- Os segredos ficam no arquivo `.env`, ignorado pelo Git.

## Recursos recomendados da VM

- Shape: `VM.Standard.A1.Flex` com a indicação **Always Free-eligible**.
- 2 OCPUs e 12 GB de memória, respeitando o limite gratuito vigente da conta.
- Ubuntu 24.04 ou versão LTS disponível.
- Volume de boot entre 47 GB e o limite gratuito disponível.

Confirme sempre a indicação **Always Free-eligible** antes de criar a VM. Não habilite recursos
pagos, IP reservado pago ou armazenamento acima da franquia gratuita.

## Preparação do servidor

1. Crie a VM e anote o IPv4 público.
2. Na lista de segurança da rede Oracle, permita TCP `22`, `80` e `443`. Restrinja `22` ao seu IP
   sempre que possível.
3. Crie no DNS um registro `A`, por exemplo `evolution.lbertanha.com`, apontando para o IPv4 da VM.
4. Instale Docker Engine e o plugin Docker Compose seguindo a documentação oficial para Ubuntu.
5. Copie a pasta `infra/evolution` para a VM.

## Configuração

Na VM, dentro desta pasta:

```bash
cp .env.example .env
chmod 600 .env
```

Edite `.env` e gere segredos independentes. Um exemplo seguro para cada valor:

```bash
openssl rand -hex 32
```

O arquivo `.env` real não deve ser enviado ao GitHub, e-mail ou atendimento.

## Inicialização e validação

```bash
docker compose pull
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose logs --tail=100 evolution
```

Depois que o DNS propagar e o certificado for emitido:

```bash
curl --fail --show-error "https://evolution.seudominio.com.br"
```

## Conexão com o Skip

No gerenciador de segredos da BitZaap, configure:

- `EVOLUTION_API_URL`: `https://evolution.seudominio.com.br`
- `EVOLUTION_API_KEY`: o mesmo valor de `EVOLUTION_API_KEY` gravado no `.env` da VM

Os segredos `APP_WEBHOOK_URL` e `EVOLUTION_WEBHOOK_SECRET` já pertencem ao backend BitZaap. A
criação de cada instância registra automaticamente o webhook autenticado em
`/backend/v1/webhook/evolution`.

## Operação

```bash
# Estado dos serviços
docker compose ps

# Logs da API
docker compose logs --tail=200 evolution

# Atualização controlada
docker compose pull evolution
docker compose up -d evolution
```

Antes de atualizar a imagem, faça backup dos volumes. O plano gratuito não oferece SLA e uma VM
com uso muito baixo pode ser recolhida pelo provedor; monitore a instância e mantenha cópias de
segurança fora dela.
