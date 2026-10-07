# QA.Interceptor - Backlog Canonico (Source of Truth)

Este arquivo e a unica fonte de verdade para status de backlog.

## Regras de Governanca

1. Status so pode ser marcado como Done com evidencia em codigo + teste/build verde.
2. Itens com apenas layout/skeleton devem ficar como In Progress.
3. `BACKLOG_FRONTEND.md` e `BACKLOG_EXPANDED.md` ficam como catalogos de planejamento, nao como status oficial.
4. Em caso de conflito entre arquivos, este arquivo prevalece.

## Validacao Executada (2026-06-13)

- Build extension: OK (`node scripts/build.mjs`)
- Testes rule-engine: OK (20 files, 578 testes passando)
- Auditoria de codigo realizada em `extension/src`, `packages/rule-engine/src`, `extension/src/storage`

## Status Validado - Itens Criticos

| ID                                   | Status Canonico | Evidencia                                                                                                |
| ------------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------- |
| QP-001 Assertion evaluation pipeline | Done            | `packages/rule-engine/src/assertion-evaluator.ts` + uso em `extension/src/sidepanel/features/network.ts` |
| QP-002 JSON Schema validation rule   | Done            | `packages/rule-engine/src/schema-validator.ts` + `schema-validator.test.ts`                              |
| QP-003 Contract snapshot comparison  | Done            | `packages/rule-engine/src/contract-comparator.ts` + `contract-comparator.test.ts`                        |
| TEST-002 Unit tests storage layer    | Done            | `packages/rule-engine/src/storage-parsers.test.ts`                                                       |
| QP-004 Export evidence JSON          | Done            | `buildEvidenceJson` em `extension/src/sidepanel/shared/utils.ts` + fluxo em `history.ts`                 |
| QP-005 Export evidence Markdown      | Done            | `buildEvidenceMarkdown` em `extension/src/sidepanel/shared/utils.ts` + fluxo em `history.ts`             |
| QP-006 Export evidence HTML report   | In Progress     | Export HTML existe em `history.ts`, mas sem charts/waterfall/report viewer completo                      |
| QP-007 Session replay/playback UI    | In Progress     | Modal e replay sequencial existem, ainda sem timeline scrubber/controles completos                       |
| QP-008 Save replayable artifact      | Todo            | Nao ha artefato offline persistente dedicado                                                             |
| OBS-001 Request/response diff UI     | In Progress     | Diff funcional basico em `network.ts`, sem nivel final de UX/documentacao                                |
| OBS-004 Execution trace visualizer   | In Progress     | Indicadores e conflitos exibidos no network, escopo parcial                                              |
| OBS-005 Rule conflict detector       | Done            | `packages/rule-engine/src/conflict-detector.ts` + testes                                                 |
| OBS-002/003/006/007/008              | Todo            | Sem implementacao completa dedicada                                                                      |
| PERF-001/002/003                     | Todo            | Sem implementacao dedicada                                                                               |

## Estado Real Frontend

- Biblioteca de componentes existe em `extension/src/sidepanel/components`.
- Design system modular existe em `extension/src/sidepanel/styles`.
- Backlog frontend contendo varios "Not Started" esta desatualizado em relacao ao codigo existente.

## Proximo Backlog Prioritario (MVP QA)

1. QP-006 - Fechar export HTML profissional (template real com secoes, metrica e impressao)
2. QP-008 - Salvar sessao replayavel offline
3. OBS-006 - Baseline capture e comparacao
4. OBS-007 - Regression report generator

## Limpeza Aplicada nesta Revisao

- Removido arquivo legado duplicado: `extension/src/sidepanel/styles.css`
- Corrigido build para copiar pasta correta: `extension/src/sidepanel/styles -> extension/dist/styles`
- Removido arquivo temporario de analise: `STATUS_REAL.md`
