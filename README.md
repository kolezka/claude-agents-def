# agents-def

Claude Code plugin with nine role subagents and an orchestrator skill for
orchestrated engineering work.

| Agent | Model | Writes | Use for |
| --- | --- | --- | --- |
| `explorer` | claude-haiku-5-5 | no | finding files, symbols, call sites, related tests |
| `codebase-researcher` | claude-sonnet-5-5 | no | tracing a subsystem across modules |
| `architect` | inherit | no | unresolved boundaries, contracts, migrations |
| `implementer` | inherit | yes | a settled, well-scoped change |
| `debugger` | inherit | yes, when authorized | wrong behavior with an unclear cause |
| `test-engineer` | claude-sonnet-5-5 | yes | focused and regression tests |
| `reviewer` | inherit | no | independent review of a named diff |
| `security-reviewer` | inherit | no | defensive review of trust boundaries |
| `verifier` | inherit | no | checking acceptance criteria after a change |

Plugin agents are namespaced, so call them as `agents-def:explorer` and so on.
The `model` passed to the Agent tool overrides the pinned model.

Run `python3 tests/test-models.py` to check agent model selectors. The fixture
is an approved synthetic subset, not a snapshot of all picker choices.

"Writes: no" is a prompt contract, not a sandbox. Those agents have Bash, and
plugin agents cannot carry `hooks` or `permissionMode` to enforce it.

## orchestrator skill

`skills/orchestrator` tells the main session to act as coordinator: split the
work, hand it to subagents, and keep only decisions and verification in the
main context. Run it with `/agents-def:orchestrator`, or let Claude load it
when the task fits its description.

## Install

From the `kolezka` marketplace:

```
/plugin marketplace add kolezka/marketplace
/plugin install agents-def@kolezka
```

Or standalone from this repo:

```
/plugin marketplace add kolezka/claude-agents-def
/plugin install agents-def@agents-def
```

After installing, remove the old user-level copies from `~/.claude/agents`,
otherwise each role shows up twice (`explorer` and `agents-def:explorer`).

## DeepSeek Harness (DSH)

`dsh/` is a DSH adapter for the same plugin tree. It imports the published
[`claude-plugin-dsh`](https://www.npmjs.com/package/claude-plugin-dsh) runtime,
pinned to exactly `0.2.0` in `dsh/package.json` and `dsh/bun.lock`. The
Claude Code install above does not use it.

Install the adapter's dependency first, before you add the plugin to DSH.
DSH does not install it for you:

```
cd dsh && bun install --frozen-lockfile
```

From the plugin root, `bun install --cwd dsh --frozen-lockfile` does the same.
Then point DSH at `dsh/`, for example as a `file:` dependency. To check what
the adapter registers, without changing anything:

```
bun x claude-plugin-dsh@0.2.0 inspect .
```

Each role, including `extras/general-purpose.md`, becomes a skill named
`agents-def-agent-<role>`, next to the `orchestrator` skill. DSH does not
enforce the agent definitions: model pins are dropped, and the tool allowlist
is only an instruction in the brief, not a permission limit. The `Writes: no`
contract above is a prompt in DSH too.

To move to a newer runtime, change the exact version in `dsh/package.json`,
run `bun install` in `dsh/`, and commit both files. Do not run the runtime's
`sync` or `scaffold` commands on this adapter: version 0.2.0 writes a vendored
`claude-compat.js` copy, and this adapter imports the package instead.

Run `node --test tests/dsh-adapter.test.mjs` to check the adapter. It needs
`bun` and network access to the npm registry, copies the plugin to a temp
directory, installs from the lockfile there and loads the adapter.

## general-purpose

`extras/general-purpose.md` is not part of the plugin. Its job is to replace the
built-in `general-purpose` agent, and only a user or project agent with that
exact name can do that. A plugin copy would be a second agent named
`agents-def:general-purpose`. Link it into `~/.claude/agents` instead:

```
ln -sf "$PWD/extras/general-purpose.md" ~/.claude/agents/general-purpose.md
```
