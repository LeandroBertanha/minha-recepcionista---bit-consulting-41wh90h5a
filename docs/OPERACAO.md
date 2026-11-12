# Operação e diagnóstico

## Estado esperado

- o painel deve exibir `Conectado` para a sessão autenticada;
- cada consulta de instâncias, contatos e mensagens deve conter o `user_id` ou a cadeia de
  propriedade da instância;
- webhooks válidos devem responder `200`;
- repetir o mesmo `message_id` na mesma instância deve responder como duplicado sem alterar contato
  ou criar mensagem;
- o mesmo `message_id` em outra instância é um evento independente.

## Diagnóstico de envio

1. Confirme o estado da sessão em **Integrações**.
2. Consulte os logs do Skip Cloud pelo horário da tentativa.
3. Localize o identificador `evo_*` apresentado ao usuário.
4. Cruze o identificador com `Evolution send failed` ou `Evolution send exception`.
5. Use apenas `status`, a categoria normalizada `reason`, `instanceId` e `type` para o diagnóstico.
   Não copie chaves, segredos, telefone ou conteúdo da conversa para chamados.

## Monitoramento de conexão

O cron `whatsapp_connection_health` executa a cada 15 minutos. Ele gera aviso quando uma instância
permanece fora de `connected` por mais de 10 minutos, informando somente contagens por estado e até
cinco IDs internos para investigação.

O aviso não desconecta, recria ou renomeia instâncias. A correção operacional deve começar por
**Atualizar** em Integrações e, quando necessário, por um novo pareamento autorizado pelo usuário.

## Realtime

O frontend aguarda 250 ms antes de remover uma assinatura. A janela permite que a nova tela registre
o listener substituto e reduz atualizações com `clientId` obsoleto durante navegação. Erros isolados
de realtime não devem ser tratados como perda de mensagem; confirme o webhook e a gravação no banco.

## Validação antes de publicar

```bash
pnpm test
pnpm build
pnpm lint
pnpm format:check
```

Publicar primeiro no Preview. A produção exige validação do login principal, do status da conexão,
de uma mensagem recebida e de uma mensagem enviada.
