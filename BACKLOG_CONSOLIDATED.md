# BACKLOG_CONSOLIDATED — QA.Interceptor Platform

> **Único backlog oficial do projeto.** Substitui e supera todos os outros backlogs.
> Os arquivos `docs/backlog/BACKLOG_CANONICAL.md`, `BACKLOG.md`, `BACKLOG_EXPANDED.md` e
> `BACKLOG_FRONTEND.md` são **histórico read-only** (catálogos), não status oficial.
> Antes de trabalhar, leia também `PROJECT_STATE.md` e `AI_DEVELOPMENT_RULES.md`.

**Última consolidação:** 2026-06-13 (auditoria de 9 fases; status validado por código + build + 578 testes)

## Política de status

- **Done**: implementado E executando em runtime, com build + teste/typecheck verdes.
- **Engine pronto / não conectado**: lógica pura implementada e testada, mas não executa na extensão.
- **In Progress**: implementação parcial, skeleton, ou sem profundidade de aceitação.
- **Todo**: não implementado.

## Taxonomia de fase (única)

`Fase 1` MVP extensão · `Fase 2` ferramentas avançadas · `Fase 3` plataforma QA ·
`Backlog Futuro` proxy desktop / team / AI / security. Esquemas antigos (3.5, 3.6, FE-x) foram aposentados.

---

## P0 — Imediato (estabilização e verdade de runtime)

| ID           | Título                                                                  | Status      | Por quê agora                                                  |
| ------------ | ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------------- |
| INT-004      | Unificar `matchesCondition` (corrigir case-sensitive vs insensitive)    | Todo        | Bug de matching de método entre engine e mock-bridge (R3)     |
| FIX-001      | Resolver `validate-schema` fantasma (implementar via schema-validator OU remover tipo) | Todo | Regra selecionável que é no-op (R4)                     |
| FIX-002      | Guardar `condition.urlContains` vazio em `buildDynamicRules`            | Todo        | Regex DNR inválido quando condição vazia (R5)                 |
| ARCH-DEC-001 | Decisão de UI runtime (plain TS vs React)                               | **Done**    | Decidido: plain TS. React removido em 2026-06-13              |
| QA-ARCH-001  | Remover subtree React órfão                                             | **Done**    | ~3.300 linhas removidas; `tsc` completo agora passa           |
| QA-BUILD-001 | Typecheck completo da extensão deve passar                             | **Done**    | `tsc -p tsconfig.json` verde após remoção                     |
| QA-DOC-001   | Consolidar/arquivar docs de status obsoletos                           | In Progress | PROJECT_STATE/AI_RULES criados; falta arquivar docs legados   |

## P1 — Integração de engines prontos (alto valor, baixo custo)

> Engines já implementados e testados; falta apenas conectar ao runtime. **Não recriar.**

| ID       | Título                                                                | Status | Engine fonte                            |
| -------- | --------------------------------------------------------------------- | ------ | --------------------------------------- |
| INT-001  | Conectar JSON Schema validation ao runtime (`validate-schema`)        | Todo   | `schema-validator.ts` (ex-QP-002)       |
| INT-002  | Conectar contract snapshot comparison à UI                            | Todo   | `contract-comparator.ts` (ex-QP-003)    |
| INT-003  | Conectar conflict detector à view network (substituir contagem inline)| Todo   | `conflict-detector.ts` (ex-OBS-005)     |
| INT-005  | Conectar conditional mock evaluator ao mock-bridge                    | Todo   | `conditional-mock-evaluator.ts` (MOCK-001) |
| INT-006  | Conectar schema inference (auto-gerar schema do tráfego)              | Todo   | `schema-inference.ts` (AI-001)          |
| TECH-001 | Decidir motor de regras: migrar background p/ `rule-index` OU remover | Todo   | `rule-index.ts`                         |

## P1 — Reporting & Observability (parciais a completar)

| ID      | Título                                  | Status      | Notas                                       |
| ------- | --------------------------------------- | ----------- | ------------------------------------------- |
| QP-006  | Export evidência HTML (profissional)    | In Progress | Falta charts/waterfall/report viewer        |
| QP-007  | Replay/playback UI completo             | In Progress | Falta timeline scrubber/controles           |
| QP-008  | Salvar sessão como artefato replayável  | Todo        | Sem artefato offline dedicado               |
| OBS-001 | Diff request/response (UX final)        | In Progress | Diff funcional via `diffText`               |
| OBS-002 | Waterfall de requests (avançado)        | Todo        | Barras básicas hoje                         |
| OBS-003 | Análise de tamanho de request           | Todo        | —                                           |
| OBS-004 | Visualizador de trace de execução       | In Progress | Badges de conflito inline (ver INT-003)     |
| OBS-006 | Captura e comparação de baseline        | Todo        | —                                           |
| OBS-007 | Gerador de relatório de regressão       | Todo        | —                                           |

## P1 — Cobertura de interceptação (limitações de plataforma)

| ID      | Título                                       | Status | Notas                                       |
| ------- | -------------------------------------------- | ------ | ------------------------------------------- |
| CAP-002 | Interceptar `XMLHttpRequest` além de `fetch` | Todo   | Mocks/delay hoje só pegam fetch (R1)        |
| CAP-003 | Avaliar captura de WebSocket                 | Todo   | Fora do escopo atual                        |

## P2 — Performance & Análise

| ID       | Título                          | Status |
| -------- | ------------------------------- | ------ |
| OBS-008  | Detecção de anomalia de tráfego | Todo   |
| PERF-001 | Detecção de gargalo             | Todo   |
| PERF-002 | Breakdown de timing de request  | Todo   |
| PERF-003 | Profiler de banda               | Todo   |

## Governança / Qualidade

| ID         | Título                                                                    | Status | Notas                                                           |
| ---------- | ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| QA-DOC-002 | Reparar links markdown quebrados + CI de link-check                       | Todo   | —                                                               |
| QA-CSS-001 | Limpeza classe-a-classe de `styles/components/*.css` órfão                | Todo   | `modal.css` é misto — não remover em bloco (R6)                 |
| QA-TEST-001| Definir estratégia de teste para UI plain-TS                              | Todo   | Testes `.tsx` foram removidos com o subtree                     |
| TD-003     | Decidir `storage/adapter.ts` (adotar p/ Phase 4 ou remover)               | Todo   | Órfão hoje                                                      |

---

## Backlog Futuro (não iniciar sem repriorização)

- **Proxy desktop (Electron):** P4-001..P4-020 — ver `docs/backlog/BACKLOG_EXPANDED.md` (catálogo histórico).
- **Team & Enterprise:** P5-001..P5-010.
- **AI & Advanced:** AI-002..AI-006, MOCK-002..004, SEC-001..004.

---

## Itens concluídos e verificados (evidência em código)

| ID         | Título                                                            | Evidência                                                       |
| ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Fase 1 MVP | Captura, regras DNR, mocks fetch, rewrite, block/delay/redirect  | `background/index.ts`, `mock-bridge.ts`                        |
| RW-001..005| Rewrites url/header/query/request-body/response-body             | `background/index.ts`, `mock-bridge.ts`                        |
| MK-001..002| Mock response + status                                           | `mock-bridge.ts`                                               |
| NS-001..003| Block / delay / redirect                                         | `background/index.ts`, `mock-bridge.ts`                        |
| NET-001..008| Clear/HAR/cURL/repeat/compose/clone/edit-resend                | `features/network.ts`, `background/index.ts`                   |
| MK-003     | Dynamic variables em templates                                   | `mock-bridge.ts` (`applyDynamicVariables`)                    |
| RQ-001..002| Rule groups CRUD + enable/ordering                               | `features/rules.ts`, `background/index.ts`                     |
| QP-001     | Assertion evaluation pipeline                                    | `evaluateAssertions` em `features/network.ts`                  |
| QP-004/005 | Export evidência JSON/Markdown                                   | `shared/utils.ts`, `features/history.ts`                       |
| ARC-001..003| Feature modules + typed messages + storage layer               | `sidepanel/features/*`, `shared-types/messages.ts`, `storage/index.ts` |
| TEST       | Suíte do rule-engine                                             | **578 testes / 20 arquivos** verdes (vitest)                  |

> **Correção histórica:** contagens de teste antigas ("26", "198/469") são **falsas**.
> O número real e validado é **578**.
>
> **Nota sobre engines:** QP-002, QP-003 e OBS-005 estavam marcados "Done" em backlogs antigos,
> mas os engines **não estão conectados ao runtime**. Foram reclassificados como INT-001/002/003.
