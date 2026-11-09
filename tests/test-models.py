#!/usr/bin/env python3
"""Check agent model selectors against the approved synthetic picker subset."""

from pathlib import Path
import sys

root = Path(__file__).resolve().parent.parent
fixture = root / "tests/fixtures/model-picker-models.txt"
approved = set(fixture.read_text(encoding="utf-8").splitlines())
if not approved:
    sys.exit(f"{fixture.relative_to(root)}: empty model fixture")

agents = sorted((root / "agents").glob("*.md")) + sorted((root / "extras").glob("*.md"))
if root / "agents/explorer.md" not in agents:
    sys.exit("agents/explorer.md: positive control was not enumerated")

errors = []
for agent in agents:
    lines = agent.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "---" or "---" not in lines[1:]:
        errors.append(f"{agent.relative_to(root)}: missing or unterminated front matter")
        continue
    end = lines.index("---", 1)
    models = [line.partition(":")[2].strip() for line in lines[1:end] if line.startswith("model:")]
    if len(models) != 1 or not models[0]:
        errors.append(f"{agent.relative_to(root)}: expected one nonempty model selector")
    elif models[0] != "inherit" and models[0] not in approved:
        errors.append(f"{agent.relative_to(root)}: rejected model selector {models[0]!r}")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"OK: checked {len(agents)} agents against the synthetic picker subset")
