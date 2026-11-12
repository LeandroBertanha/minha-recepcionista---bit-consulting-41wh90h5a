# Roadmap — Minha Recepcionista

Atualizado em 12 de novembro de 2026.

## Concluído

- autenticação e papéis por empresa;
- temas claro e escuro com a identidade visual do produto;
- Evolution API conectada ao Skip Cloud;
- envio, recebimento e histórico do WhatsApp em produção;
- isolamento de instância, QR Code, contatos e mensagens por login;
- versão `0.0.42` publicada no domínio operacional;
- código sincronizado com o GitHub e cobertura automatizada do isolamento.

## Em andamento — estabilização `0.0.43`

- reduzir erros transitórios de realtime durante trocas de tela;
- tornar falhas da Evolution rastreáveis por identificador de correlação, sem expor dados;
- garantir idempotência completa do webhook antes de baixar mídia ou atualizar contato;
- monitorar instâncias que permanecem desconectadas ou conectando;
- manter testes, build, lint e formatação dos arquivos alterados aprovados antes do Preview.

## Aguardando dependência externa

- finalizar a emissão do certificado de `airecepcionista.com.br`;
- validar HTTPS e redirecionamentos do novo domínio;
- substituir o domínio operacional somente após a validação completa.

## Fora do roadmap atual

- teste manual de uma conta adicional de WhatsApp.

A retirada do teste manual não reduz as regras nem os testes automatizados de isolamento entre
usuários. A atividade poderá voltar ao roadmap quando houver disponibilidade para o pareamento de
outro aparelho.
