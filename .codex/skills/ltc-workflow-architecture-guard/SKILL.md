---
name: ltc-workflow-architecture-guard
description: Use for LTC workflow/space/platform changes to enforce immutable architecture guardrails: tenant > space hierarchy isolation in business layer, Flowable 6.8.1 as execution kernel only, no self-built engine semantics, and mandatory risk-gated delivery checks.
---

# LTC Workflow Architecture Guard

## When to use
- Any requirement, design, code change, review, SQL migration, or incident fix in LTC workflow/space modules.
- Any change touching `tenant_id`, process template/node/instance/task/comment, Flowable integration, or workflow UI behavior.

## Non-negotiable architecture constraints
1. Flowable 6.8.1 is the **only** workflow execution kernel.
2. Do **not** self-build token/engine semantics in business code.
3. Do **not** modify Flowable `act_*` table structure.
4. Do **not** expose Flowable-native APIs/IDs directly as business contract.
5. Isolation hierarchy is fixed: **tenant > space > business data**.
6. Multi-tenant isolation lives in business layer; business tables must carry `tenant_id`, and space-scoped tables must carry `space_id`.
7. Query/update/delete must enforce tenant condition by default; space-scoped data must enforce `tenant_id + space_id`.
8. Permissions, visibility, and data scope are enforced by business services, not bypassed in controller/SQL.

## Required delivery workflow
1. Confirm scope:
- Identify touched modules and whether change affects tenant isolation or process execution.
2. Risk pre-check (must output):
- Cross-tenant leakage risk
- Cross-space leakage risk (within same tenant)
- Permission bypass risk
- Flow/business state consistency risk
- Template upgrade compatibility risk
3. Design/implementation:
- Keep layering: Controller -> Service -> Domain/Adapter -> Flowable.
- Use mapping between business instance/task and Flowable instance/task IDs.
4. Validation:
- Tenant isolation regression (positive + negative cases)
- Workflow action idempotency (submit/approve/reject/retry)
- Audit trail completeness
5. Merge gate:
- If any architecture constraint is violated, stop and propose compliant alternative.

## Forbidden patterns
- Controller directly invoking Flowable runtime/task services.
- SQL without tenant condition for tenant-scoped data.
- SQL without `tenant_id + space_id` for space-scoped data.
- “Temporary” cross-tenant data patch without audit.
- Bypassing space-authorization and directly reading other spaces in same tenant.
- Feature shortcuts that bypass policy service.
- Introducing independent workflow execution logic outside Flowable.

## Output format for every task using this skill
Provide these sections in order:
1. `Architecture Fit`: state whether change complies; if not, list violations.
2. `Risk Checklist`: P0/P1 risks and mitigations.
3. `Implementation Plan`: minimal compliant plan.
4. `Verification`: concrete tests/checks run or required.

## Reference
- Read and align with:  
`/Users/jocelyn/Documents/LTCplatform/tranyu-system/docs/architecture/workflow_multitenant_architecture_v1.md`
- Cursor 项目内更完整约束（PermissionEngine、泳道 nextIds 语义等）：  
`.cursor/skills/tranyu-platform-architecture/SKILL.md`
