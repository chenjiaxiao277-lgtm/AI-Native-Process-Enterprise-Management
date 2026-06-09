---
name: context-rollover-refresh
description: Refresh and persist rolling AI background context in project scope when context is close to limit or when a new background begins. Use when users mention 背景信息快满, 上下文压缩/刷新, 开启新背景, 继续上次进度, or when they issue the fallback command 执行背景刷新.
---

# Context Rollover Refresh

## Overview

Use this skill to keep long-running work stable across context rollovers. Collect the current operation log, plan, reasoning, decisions, blockers, and next steps, then append one structured record into the project background file.

## Trigger Signals

Trigger this skill in either of these cases:

1. Automatic detection:
- Context appears close to limit.
- Conversation asks for context compression/refresh.
- User asks to continue prior progress after a background transition.

2. Manual fallback command:
- User message contains `执行背景刷新`.

## Mandatory Workflow

1. Confirm trigger reason and choose a short `触发原因` sentence.
2. Collect this turn's core state:
- `任务目标`
- `操作日志`
- `计划`
- `思路与决策`
- `风险与阻塞`
- `下一步`
3. Load the fixed template from `references/background-template.md`.
4. Append a structured record using:
- `python3 scripts/refresh_background.py append ...`
5. If this is a "new background start" moment:
- Run `python3 scripts/refresh_background.py latest` first.
- Output the generated "新背景开场同步" summary before continuing the new task.
- Read only the latest summary by default. Do not load full historical records into the active context.

## Output Contract

Always keep section order exactly as:

1. `任务目标`
2. `操作日志`
3. `计划`
4. `思路与决策`
5. `风险与阻塞`
6. `下一步`

Use Chinese by default. If information is missing, write `（待补充）` instead of skipping sections.

## Guardrails

- Append only. Never rewrite or delete historical records in the background file.
- Keep each section concise and actionable.
- Never paste full raw logs, giant stack traces, or full command outputs into any section.
- Keep each section short (default capped by script with `--section-max-chars`).
- Preserve full chronology with timestamp and separator.
- Use the project file path only:
`/Users/jocelyn/Documents/LTCplatform/.codex/context/ai-background.md`

## Command Reference

Create file header (safe to run multiple times):

```bash
python3 scripts/refresh_background.py init
```

Append one refresh record:

```bash
python3 scripts/refresh_background.py append \
  --trigger "背景信息快用完了" \
  --goal "..." \
  --ops "..." \
  --plan "..." \
  --thinking "..." \
  --risks "..." \
  --next "..." \
  --section-max-chars 1200 \
  --keep-records 200
```

Generate startup sync summary from latest record:

```bash
python3 scripts/refresh_background.py latest
```

Keep only newest records (optional periodic cleanup):

```bash
python3 scripts/refresh_background.py prune --keep-records 200
```

## Resources

- `references/background-template.md`: fixed section template for refresh records.
- `scripts/refresh_background.py`: deterministic append and latest-summary utility.
