# agents-def

Claude Code plugin with nine role subagents for orchestrated engineering work.

| Agent | Model | Writes | Use for |
| --- | --- | --- | --- |
| `explorer` | haiku | no | finding files, symbols, call sites, related tests |
| `codebase-researcher` | sonnet | no | tracing a subsystem across modules |
| `architect` | inherit | no | unresolved boundaries, contracts, migrations |
| `implementer` | inherit | yes | a settled, well-scoped change |
| `debugger` | inherit | yes, when authorized | wrong behavior with an unclear cause |
| `test-engineer` | sonnet | yes | focused and regression tests |
| `reviewer` | inherit | no | independent review of a named diff |
| `security-reviewer` | inherit | no | defensive review of trust boundaries |
| `verifier` | inherit | no | checking acceptance criteria after a change |

Plugin agents are namespaced, so call them as `agents-def:explorer` and so on.
The `model` passed to the Agent tool overrides the pinned model.

"Writes: no" is a prompt contract, not a sandbox. Those agents have Bash, and
plugin agents cannot carry `hooks` or `permissionMode` to enforce it.

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

## general-purpose

`extras/general-purpose.md` is not part of the plugin. Its job is to replace the
built-in `general-purpose` agent, and only a user or project agent with that
exact name can do that. A plugin copy would be a second agent named
`agents-def:general-purpose`. Link it into `~/.claude/agents` instead:

```
ln -sf "$PWD/extras/general-purpose.md" ~/.claude/agents/general-purpose.md
```

`critic` and `curriculum` stay in `dotfiles-next`, because they depend on its
`kb` tooling and Outline layout.
