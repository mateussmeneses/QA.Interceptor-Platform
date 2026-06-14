# PROJECT_STATE — QA.Interceptor Platform

> **Fonte única de verdade do projeto.** Toda sessão de IA ou desenvolvedor DEVE ler
> este arquivo e `BACKLOG_CONSOLIDATED.md` antes de iniciar qualquer trabalho.
> Atualize este documento sempre que concluir uma funcionalidade ou mudar a arquitetura.

**Última auditoria:** 2026-06-13 (auditoria completa de 9 fases, evidência por código + build + testes)
**Evidência de saúde atual:** `npm run build` ✅ · `tsc` completo ✅ (sem erros) · `npm test` ✅ 578 testes / 20 arquivos

---

## 1. Objetivo do projeto

Extensão de navegador (Manifest V3) **open-source** focada em QA e teste de APIs. Permite a
analistas de QA interceptar, modificar, mockar e validar tráfego HTTP sem conhecimento de
desenvolvimento. Meta de longo prazo: alternativa leve a Requestly / Charles / Burp,
orientada a QA. Tudo roda **localmente**; nenhum dado é coletado ou enviado para fora.

---

## 2. Estado atual

MVP funcional. O núcleo de interceptação, regras, mocks, captura, assertions e exportação de
evidências funciona ponta a ponta. A auditoria de 2026-06-13 removeu a camada React morta
(~3.300 linhas) e destravou o typecheck completo. Persistem engines implementados-mas-não-
conectados e limitações de plataforma documentadas abaixo.

---

## 3. Arquitetura oficial

**Decisão fechada (ADR-001/004 + auditoria):**

- **UI = TypeScript puro + DOM imperativo.** `extension/src/sidepanel/index.html` +
  `features/*.ts`. **NÃO usar React.** A antiga camada `components/*.tsx` foi removida.
- **Lógica pura = pacote bounded `@qa-interceptor/rule-engine`.** Sem `chrome`/`window`/DOM.
- **Tipos = pacote `@qa-interceptor/shared-types`.** Fonte única de tipos de domínio e mensagens.
- **Storage = camada única `extension/src/storage/index.ts`** sobre `chrome.storage.local`.
- **Motor de regras oficial = `evaluateRules`** (`rule-engine/src/index.ts`).

```
shared-types  ←  rule-engine  ←  extension (background / content / sidepanel / storage)
```

Sem dependências circulares. Direção de import é unidirecional.

---

## 4. Funcionalidades

### ✅ Funcionando (validado por código + build)

- Captura de requests via `webRequest` + render no inspector.
- Regras via DNR (todo o tráfego): `rewrite-url`, `rewrite-header`, `redirect`, `block`, `rewrite-query`.
- Mocks via fetch bridge (somente `window.fetch`): `mock-response`, `mock-status`, `rewrite-response`, `rewrite-request-body`, `delay`.
- Replay (`REPEAT_REQUEST`), compose, clone de request.
- Assertions de resposta (`evaluateAssertions` — conectado em `network.ts`).
- Diff de resposta (`diffText` — conectado).
- Grupos de regras (prioridade + filtro de grupo habilitado).
- Import/export de regras (JSON), HAR import/export, cópia como cURL.
- Export de evidência JSON / Markdown / HTML.
- Propagação de edições sem reload (`storage.onChanged`).
- Dynamic variables em templates de mock (`{{timestamp}}`, `{{uuid}}`, `{{method}}`, `{{url}}`, env vars).

### 🟡 Parcialmente implementadas

- `QP-006` Export HTML — existe, sem charts/waterfall completos.
- `QP-007` Replay player — replay sequencial, sem timeline/scrubber.
- `OBS-001` Diff UI — funcional, UX parcial.
- `OBS-004` Execution trace — badges de conflito inline (não usa o engine `conflict-detector`).
- Captura de corpo de resposta — só para respostas mockadas (limitação MV3 `webRequest`).

### 🟦 Implementadas como engine, NÃO conectadas ao runtime (valor pronto, falta wiring)

> Estes módulos compilam e têm testes verdes, mas **nenhuma linha executa** na extensão
> rodando. NÃO os recrie. Conecte-os (ver backlog INT-*).

- `schema-validator.ts` (JSON Schema draft-07) — QP-002.
- `contract-comparator.ts` (drift de contrato) — QP-003.
- `conflict-detector.ts` (4 tipos de conflito) — OBS-005.
- `conditional-mock-evaluator.ts` (mock condicional) — MOCK-001.
- `schema-inference.ts` (inferência de schema) — AI-001.
- `rule-index.ts` (motor indexado concorrente) — TECH-001 (decidir: migrar ou remover).

### ❌ Não implementadas / fantasma

- `validate-schema` — tipo de regra existe e é selecionável, mas **não tem handler** (no-op). Decidir: implementar via `schema-validator` ou remover o tipo.
- Interceptação de `XMLHttpRequest` / WebSocket — mocks só pegam `fetch`.
- Fase 4 (proxy desktop), Fase 5 (team/enterprise), Fase Futuro (AI/security) — não iniciadas.

---

## 5. Estrutura oficial de diretórios

```
extension/
  manifest.json              MV3: DNR, webRequest, sidePanel, content script
  scripts/build.mjs          esbuild: background, sidepanel/main, injector, mock-bridge
  tsconfig.json              typecheck completo (deve passar)
  tsconfig.runtime.json      escopo de runtime
  src/
    background/index.ts      DNR sync + webRequest capture + replay
    content/injector.ts      injeta bridge + relay de mensagens
    content/mock-bridge.ts   patch de fetch (mocks/rewrites/delay) na página
    storage/index.ts         camada única de storage (parsers + chaves)
    storage/adapter.ts       ⚠️ ÓRFÃO (ver TECHNICAL_DEBT TD-003)
    sidepanel/
      main.ts                orquestrador
      index.html             markup de todas as views
      features/*.ts          rules, network, mocks, history, settings, navigation
      shared/                utils, modal-controller, theme-manager, types
      styles/                tokens, global, layout + styles/components/*.css
packages/
  shared-types/src/          index.ts (domínio) + messages.ts (contratos)
  rule-engine/src/           lógica pura + testes (*.test.ts)
docs/
  adr/                       ADR-001..006
  architecture/ backlog/ planning/ analysis/ reference/
```

---

## 6. Fluxos principais

1. **Regras DNR:** sidepanel grava regra → `storage.onChanged` → background `syncDynamicRules` → `updateDynamicRules`. Aplica a todo o tráfego.
2. **Mock/rewrite (fetch):** injector lê storage → `RULES_UPDATE` para a página → mock-bridge faz patch de `fetch` → ao casar, retorna `Response` sintética → `MOCK_APPLIED` → injector relay → background grava captura → sidepanel renderiza.
3. **Replay/compose:** sidepanel → `REPEAT_REQUEST` → background faz `fetch` real → captura nova entrada.
4. **Assertions/diff:** rodam no sidepanel (`network.ts`) usando `evaluateAssertions` e `diffText` do rule-engine.

---

## 7. Dependências críticas

- `esbuild` (bundling), `typescript`, `vitest` (testes do engine), `@types/chrome`.
- Ferramentas de qualidade: eslint, prettier, husky, commitlint, lint-staged.
- **Nenhuma dependência de runtime React** (removida). Não reintroduzir sem ADR.

---

## 8. Riscos conhecidos

- **R1 (Crítico):** mocks/delay só interceptam `fetch` → não funcionam em sites que usam XHR.
- **R2 (Crítico):** 6 engines não conectados podem ser "recriados" por engano por sessões futuras.
- **R3 (Médio):** `matchesCondition` divergente (case-sensitive no engine vs case-insensitive no bridge) → bug de matching de método.
- **R4 (Médio):** `validate-schema` fantasma confunde usuários.
- **R5 (Médio):** `buildDynamicRules` sem guarda para `condition.urlContains` vazio → regex inválido.
- **R6 (Baixo):** CSS de componentes (`styles/components/*.css`) parcialmente órfão após remoção dos `.tsx` (exige limpeza classe-a-classe; `modal.css` é misto — não remover em bloco).

---

## 9. Próxima tarefa recomendada

**INT-004 — Corrigir `matchesCondition` divergente (R3)** e **L-09 — resolver `validate-schema` fantasma (R4)**: ambos são correções pequenas, de alto valor e baixo risco. Em seguida, **INT-001 — conectar `schema-validator` ao tipo `validate-schema`** (transforma engine ocioso em feature real). Ver `BACKLOG_CONSOLIDATED.md`.

---

## 10. Arquivos que DEVEM ser alterados (zonas de trabalho ativas)

- `extension/src/sidepanel/features/*.ts` — UI e wiring.
- `extension/src/background/index.ts` — pipeline DNR e captura.
- `extension/src/content/mock-bridge.ts` — interceptação fetch.
- `packages/rule-engine/src/*.ts` — lógica pura (+ testes obrigatórios).
- `packages/shared-types/src/*.ts` — tipos e contratos.

## 11. Arquivos que NÃO devem ser alterados sem decisão arquitetural

- `extension/manifest.json` — mudar permissões só com justificativa de segurança.
- `extension/scripts/build.mjs` — pipeline de build estável.
- `docs/adr/*.md` — ADRs aceitos; criar novo ADR em vez de editar os antigos.
- `extension/src/storage/adapter.ts` — órfão; **não usar nem deletar** sem decidir TD-003.
