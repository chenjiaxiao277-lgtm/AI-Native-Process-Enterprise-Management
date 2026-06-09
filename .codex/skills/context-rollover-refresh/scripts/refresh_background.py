#!/usr/bin/env python3
"""Append and summarize rolling AI background records."""

from __future__ import annotations

import argparse
import re
from datetime import datetime
from pathlib import Path

DEFAULT_FILE = Path("/Users/jocelyn/Documents/LTCplatform/.codex/context/ai-background.md")
PLACEHOLDER = "（待补充）"
RECORD_HEADER = "## 背景刷新记录 - "
DEFAULT_SECTION_MAX_CHARS = 1200
DEFAULT_KEEP_RECORDS = 200
SECTIONS = [
    ("任务目标", "goal"),
    ("操作日志", "ops"),
    ("计划", "plan"),
    ("思路与决策", "thinking"),
    ("风险与阻塞", "risks"),
    ("下一步", "next"),
]


def _normalize_text(value: str | None) -> str:
    if value is None:
        return PLACEHOLDER
    text = value.strip()
    if not text:
        return PLACEHOLDER
    cleaned = "\n".join(line.rstrip() for line in text.splitlines())
    return cleaned or PLACEHOLDER


def _truncate_text(text: str, max_chars: int) -> str:
    if max_chars <= 0:
        return text
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def _list_record_blocks(content: str) -> list[str]:
    matches = list(re.finditer(r"^## 背景刷新记录 - .*$", content, flags=re.MULTILINE))
    if not matches:
        return []

    blocks: list[str] = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        block = content[start:end].strip()
        if block:
            blocks.append(block)
    return blocks


def _prune_to_recent(path: Path, keep_records: int) -> int:
    if keep_records <= 0:
        return 0

    content = path.read_text(encoding="utf-8")
    matches = list(re.finditer(r"^## 背景刷新记录 - .*$", content, flags=re.MULTILINE))
    if len(matches) <= keep_records:
        return 0

    preamble = content[: matches[0].start()].rstrip()
    records = _list_record_blocks(content)
    kept = records[-keep_records:]
    body = "\n---\n\n".join(kept)
    rebuilt = f"{preamble}\n{body}\n"
    path.write_text(rebuilt, encoding="utf-8")
    return len(records) - len(kept)


def _ensure_file(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        return
    header = (
        "# AI 背景信息滚动记录\n\n"
        "此文件由 `context-rollover-refresh` 技能维护，采用持续追加策略。\n\n"
        "---\n"
    )
    path.write_text(header, encoding="utf-8")


def init_file(path: Path) -> None:
    _ensure_file(path)
    print(f"Initialized: {path}")


def append_record(path: Path, args: argparse.Namespace) -> None:
    _ensure_file(path)

    timestamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %z")
    section_max_chars = max(int(args.section_max_chars), 80)
    payload = {
        "goal": _truncate_text(_normalize_text(args.goal), section_max_chars),
        "ops": _truncate_text(_normalize_text(args.ops), section_max_chars),
        "plan": _truncate_text(_normalize_text(args.plan), section_max_chars),
        "thinking": _truncate_text(_normalize_text(args.thinking), section_max_chars),
        "risks": _truncate_text(_normalize_text(args.risks), section_max_chars),
        "next": _truncate_text(_normalize_text(args.next), section_max_chars),
    }

    lines = [
        f"{RECORD_HEADER}{timestamp}",
        f"- 触发原因: {_normalize_text(args.trigger)}",
        "",
    ]

    for title, key in SECTIONS:
        lines.append(f"### {title}")
        lines.append(payload[key])
        lines.append("")

    entry = "\n".join(lines).rstrip() + "\n"

    current = path.read_text(encoding="utf-8")
    separator = "\n---\n\n" if RECORD_HEADER in current else "\n"
    path.write_text(current.rstrip() + separator + entry, encoding="utf-8")
    pruned = _prune_to_recent(path, int(args.keep_records))
    print(f"Appended refresh record: {path}")
    if pruned > 0:
        print(f"Pruned old records: {pruned}")


def _latest_record(content: str) -> str | None:
    matches = list(re.finditer(r"^## 背景刷新记录 - .*$", content, flags=re.MULTILINE))
    if not matches:
        return None
    start = matches[-1].start()
    return content[start:].strip()


def _parse_record(record: str) -> dict[str, str]:
    lines = record.splitlines()
    data: dict[str, str] = {}
    if lines:
        data["timestamp"] = lines[0].replace(RECORD_HEADER, "", 1).strip()
    if len(lines) > 1 and lines[1].startswith("- 触发原因:"):
        data["trigger"] = lines[1].split(":", 1)[1].strip() or PLACEHOLDER
    else:
        data["trigger"] = PLACEHOLDER

    current_title = None
    buffer: list[str] = []

    def flush() -> None:
        nonlocal buffer, current_title
        if not current_title:
            return
        text = "\n".join(buffer).strip()
        data[current_title] = text or PLACEHOLDER
        buffer = []

    for line in lines[2:]:
        if line.startswith("### "):
            flush()
            current_title = line[4:].strip()
            continue
        if current_title is not None:
            buffer.append(line)

    flush()
    return data


def _one_line(text: str, max_chars: int) -> str:
    compact = " ".join(part.strip() for part in text.splitlines() if part.strip())
    if not compact:
        return PLACEHOLDER
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 1].rstrip() + "…"


def latest_summary(path: Path, max_chars: int) -> int:
    if not path.exists():
        print(f"No background file found: {path}")
        return 1

    content = path.read_text(encoding="utf-8")
    latest = _latest_record(content)
    if not latest:
        print("No refresh record found yet.")
        return 1

    parsed = _parse_record(latest)
    print("# 新背景开场同步")
    print(f"- 最近刷新时间: {parsed.get('timestamp', PLACEHOLDER)}")
    print(f"- 触发原因: {parsed.get('trigger', PLACEHOLDER)}")

    for title, _ in SECTIONS:
        print(f"- {title}: {_one_line(parsed.get(title, PLACEHOLDER), max_chars)}")

    print(f"- 背景文件: {path}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Refresh rolling AI background records")
    parser.add_argument("--file", default=str(DEFAULT_FILE), help="Background markdown path")

    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="Initialize background file and parent directory")

    append = sub.add_parser("append", help="Append one structured refresh record")
    append.add_argument("--trigger", default="背景信息刷新")
    append.add_argument("--goal")
    append.add_argument("--ops")
    append.add_argument("--plan")
    append.add_argument("--thinking")
    append.add_argument("--risks")
    append.add_argument("--next")
    append.add_argument("--section-max-chars", type=int, default=DEFAULT_SECTION_MAX_CHARS)
    append.add_argument("--keep-records", type=int, default=DEFAULT_KEEP_RECORDS)

    latest = sub.add_parser("latest", help="Print startup sync summary from latest record")
    latest.add_argument("--max-chars", type=int, default=120)

    prune = sub.add_parser("prune", help="Keep only the newest N refresh records")
    prune.add_argument("--keep-records", type=int, default=DEFAULT_KEEP_RECORDS)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    path = Path(args.file).expanduser()

    if args.command == "init":
        init_file(path)
        return 0
    if args.command == "append":
        append_record(path, args)
        return 0
    if args.command == "latest":
        return latest_summary(path, args.max_chars)
    if args.command == "prune":
        _ensure_file(path)
        pruned = _prune_to_recent(path, int(args.keep_records))
        print(f"Pruned old records: {pruned}")
        return 0

    parser.error("Unknown command")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
