# Documentation Structure

This file defines ownership of each top-level document to avoid redundancy.

## Single Source of Truth

- `PRODUCT_VISION.md`
  - Owns: problem statement, vision, target users, product outcomes, non-goals.
  - Must not include: implementation backlog details.

- `PROJECT_RULES.md`
  - Owns: non-negotiable architecture, security, performance, and engineering rules.
  - Must not include: broad product storytelling.

- `ARCHITECTURE.md`
  - Owns: technical layers, flow diagrams, and core components.
  - Must not include: roadmap milestones.

- `ROADMAP.md`
  - Owns: phased evolution and milestone outcomes.
  - Must not include: repeated product vision text.

- `BACKLOG.md`
  - Owns: actionable work items with priority, status, owner, acceptance criteria.
  - Must not include: broad narrative sections.

- `CONTRIBUTING.md`
  - Owns: contribution workflow, branch and commit conventions, PR checklist, language policy.
  - Must not include: architecture internals.

- `MANIFEST.md`
  - Owns: project principles and feature filter.
  - Must not include: roadmap and detailed use cases.

- `README.md`
  - Owns: onboarding entry point and links to all key docs.
  - Must not duplicate full contents of deeper docs.

## Update Rules

1. Update only the owning file when a rule or concept changes.
2. In non-owning files, reference the owner document instead of copying paragraphs.
3. Keep files short and purpose-specific.
