# Requestly Interceptor Benchmark Analysis

## Purpose

Map Requestly Interceptor capabilities and architecture to guide QA.Interceptor backlog evolution while keeping the product QA-first, local-first, and lightweight.

## Functional Map (Requestly)

Core capabilities identified:
- Request interception and rewriting (URL, headers, query params, redirect, block)
- Client-side interception for request body/response body/delay
- Rule authoring and management at scale
- Mocking workflows (status/body/headers)
- Network inspector and execution visibility
- API client (Postman-like)
- Session recording and replay
- Workspaces/team collaboration and cloud sync
- Import/export and adapters for interoperability

## Frontend Map (Requestly)

Main frontend shape:
- React application reused across web, desktop, and extension surfaces
- Feature-based modules (rules, mocks, networkInspector, apiClient, sessionBook, workspaces)
- Mixed state strategy:
  - Redux Toolkit for global and shared state
  - Zustand for feature-local complex state
- Multiple layouts per app context (dashboard/minimal/fullscreen)
- Platform-aware rendering via runtime mode flags

Frontend patterns relevant for QA.Interceptor:
- Strong feature boundaries per domain
- UI actions linked to clear runtime paths
- Context-aware UX (extension mode vs desktop/web mode)
- Reusable design components and consistent visual language

## Architecture Map (Requestly)

Key architectural patterns:
- Modular monorepo split: app, extension, shared, rule processor
- MV3 dual strategy:
  - DNR for declarative interception
  - webRequest for read-only execution observability
  - page script fetch/XHR patch for body-level manipulation
- Centralized message handling between service worker/content/page/app contexts
- Shared storage abstraction and typed domain contracts
- Execution tracking pipeline for "which rule matched which request"

## Gap Analysis vs QA.Interceptor

Already aligned in QA.Interceptor:
- MV3 extension shell and sidepanel UX
- Core rewrite/mock/network simulation rules
- HAR and cURL import/export basics
- Repeat/compose/clone/edit-resend request tools
- Dynamic variables in mock/rewrite templates

Primary gaps to prioritize:
- Rule groups and grouped enable/disable execution
- Execution observability and dedicated debugging surfaces
- Mock template library and environment-variable substitution
- Request/rule organization primitives (collections, folders, tags)
- QA assertion workflows for contract validation

## Recommended Backlog Direction

Near-term (P1):
- Rule Groups, Execution Log, Mock Template Library, Mock Environment Variables
- Collections/Folders/Tags for rule and request organization

Mid-term (P1/P2):
- Minimal API Client scoped for QA verification scenarios
- Response assertion presets and contract checks
- Error simulation profiles for common QA cases

Guardrails:
- Keep local-first defaults and avoid mandatory cloud dependencies
- Preserve extension performance and deterministic rule behavior
- Prefer modular feature directories and typed message contracts
