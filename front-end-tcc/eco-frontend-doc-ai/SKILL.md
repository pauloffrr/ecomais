---
name: eco-frontend-doc-ai
description: Analisa este frontend Eco+ em React Native e Expo e cria ou atualiza documentacao tecnica academica sobre arquitetura, telas, componentes, navegacao, estado, autenticacao JWT, API, UI/UX, clean code, riscos e diagramas C4. Use para documentar o frontend para o TCC, revisar a arquitetura mobile, mapear fluxos ou registrar melhorias do projeto.
---

# Eco+ Frontend Doc AI

Produzir documentacao fiel ao codigo atual deste repositorio. Manter o foco no frontend e citar o backend somente pelas interfaces observadas nos services.

## Fluxo

1. Ler `package.json`, `app.json`, `App.js`, configuracoes e documentacao existente.
2. Mapear `src/screens`, `src/components`, `src/navigation`, `src/services`, `src/hooks`, `src/context`, `src/theme`, `src/api` e `src/mocks`.
3. Seguir imports desde `App.js` para identificar apenas arquivos ativos.
4. Mapear telas, dados, loading, erro, empty state, validacoes, chamadas externas e navegacao.
5. Rastrear API, JWT e sessao desde a interface ate Axios e armazenamento local.
6. Classificar funcionalidades como `Confirmado`, `Parcial/Mockado` ou `Nao localizado`.
7. Registrar boas praticas e problemas com evidencias em caminhos de arquivos.
8. Criar ou atualizar `DOCUMENTACAO_FRONTEND.md` na raiz deste projeto.
9. Revisar o texto em portugues formal e adequado a TCC.

## Regras

- Nao inventar telas, endpoints, testes ou garantias de seguranca.
- Distinguir dependencia instalada de tecnologia realmente usada.
- Relacionar endpoints aos services e consumidores.
- Verificar duplicacao, mocks, arquivos mortos, componentes extensos, erros, responsividade e acessibilidade.
- Verificar protecao de rotas, expiracao do JWT, logout e armazenamento de credenciais.
- Nao escrever a documentacao na pasta pai ou junto ao backend.
- Usar `references/report-template.md` como estrutura base.

## Diagramas

Gerar Mermaid somente quando representar o codigo observado ou uma proposta identificada:

- C4 nivel 1: pessoas, app e sistemas externos.
- C4 nivel 2: aplicativo mobile e containers externos.
- C4 nivel 3: modulos reais do frontend.
- Fluxos de autenticacao, scanner e navegacao quando relevantes.

## Qualidade

- Incluir caminhos de arquivos nas afirmacoes importantes.
- Usar tabelas para telas, componentes, endpoints e melhorias.
- Ordenar recomendacoes por prioridade e impacto.
- Declarar limitacoes e funcionalidades parciais.
