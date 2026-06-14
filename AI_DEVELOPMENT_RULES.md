# AI_DEVELOPMENT_RULES — QA.Interceptor Platform

> Regras obrigatórias para qualquer sessão de IA (Copilot, Claude, GPT, Gemini, Cursor, etc.)
> ou desenvolvedor humano que trabalhe neste repositório. O objetivo é evitar retrabalho,
> código duplicado e implementações paralelas — problemas reais já encontrados neste projeto.

---

## 0. Antes de qualquer trabalho (gate obrigatório)

1. **Leia `PROJECT_STATE.md`** — entenda o estado real, a arquitetura oficial e o que já existe.
2. **Leia `BACKLOG_CONSOLIDATED.md`** — é o **único** backlog oficial. Não use outros.
3. **Não confie na documentação histórica** (`docs/analysis/*`, `docs/planning/*`): são snapshots
   datados e podem contradizer o código. O **código é a evidência principal**.

---

## 1. Antes de criar qualquer funcionalidade

- **Verifique se já existe.** Pesquise em `packages/rule-engine/src`, `extension/src` e
  `BACKLOG_CONSOLIDATED.md`. Vários engines já estão implementados mas **não conectados**
  (schema-validator, contract-comparator, conflict-detector, conditional-mock-evaluator,
  schema-inference). **Conecte o que existe; não recrie.**
- **Nunca crie uma implementação paralela** para algo que já existe (foi a causa raiz da
  camada React morta e dos dois motores de regra concorrentes).
- **Priorize reutilização** antes de criar novo módulo, componente ou utilitário.

---

## 2. Arquitetura — não violar

- **UI é TypeScript puro + DOM.** **Proibido reintroduzir React** sem um novo ADR aprovado.
- **Lógica pura vai no `rule-engine`** (sem `chrome`/`window`/DOM). Tudo com teste.
- **Tipos de domínio vivem em `shared-types`.** Não redefina `Rule`, `RuleCondition`,
  `MockEnvVar`, etc. localmente — importe.
- **Storage só via `extension/src/storage/index.ts`.**
- **Um motor de regras só:** `evaluateRules`. Não criar motores concorrentes.
- **Sem dependências circulares.** Direção: `shared-types ← rule-engine ← extension`.

---

## 3. Backlog e documentação

- **Nunca crie um novo backlog.** Atualize `BACKLOG_CONSOLIDATED.md`.
- **Nenhuma tarefa pode existir em mais de um lugar.** IDs são únicos.
- **Status só é "Done" com evidência:** código + build verde + teste/typecheck verde.
  Layout/skeleton = "In Progress". Engine não conectado = "Engine pronto / não conectado".
- **Atualize `PROJECT_STATE.md`** após concluir qualquer funcionalidade ou mudança de arquitetura.
- Documentos em `docs/analysis/`, `docs/planning/` e backlogs antigos são **histórico read-only**.

---

## 4. Qualidade de código

- Aplique **DRY, KISS e SOLID**. Prefira composição a herança. Módulos pequenos.
- **Evite duplicação de código.** Se copiar lógica, pare e extraia para um módulo compartilhado.
- TypeScript estrito. **Evite `any`.** Valide apenas nas fronteiras do sistema.
- **Não** adicione comentários/docstrings/tipos a código que você não alterou.
- **Não** crie helpers/abstrações para uso único.
- **Não** adicione tratamento de erro para cenários impossíveis.

---

## 5. Validação obrigatória antes de concluir

Rode e garanta verde:

```
npm run build         # build de extension + pacotes
npm test              # testes do rule-engine (vitest)
cd extension && npx tsc -p tsconfig.json --noEmit   # typecheck COMPLETO deve passar
```

Se adicionar lógica pura ao `rule-engine`, **adicione testes** (`*.test.ts`).

---

## 6. Segurança e escopo

- Tudo roda **localmente**. **Nunca** colete dados do usuário nem envie tráfego para serviços externos.
- HTML é construído por concatenação de strings: **sempre** use `escapeHtml` em dados dinâmicos.
- Não altere `manifest.json` (permissões) sem justificativa de segurança documentada.

---

## 7. Anti-padrões já cometidos neste projeto (não repetir)

| Anti-padrão | O que aconteceu | Regra |
| --- | --- | --- |
| Implementação paralela | Camada React inteira criada sem conectar ao runtime (~3.300 L mortas) | Nunca duas UIs/stacks |
| Motor concorrente | `rule-index.ts` duplicou `evaluateRules` sem substituí-lo | Um motor só |
| Cópia de tipos | `Rule`/`MockEnvVar` redefinidos em 4 lugares | Importe de `shared-types` |
| Parsers duplicados | `storage-parsers.ts` copiou `storage/index.ts` | Fonte única |
| "Done" sem execução | Engines marcados Done mas nunca conectados | Done = executa em runtime |
| Backlogs múltiplos | 5 backlogs com status divergentes | Um backlog só |
