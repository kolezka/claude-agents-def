---
name: orchestrator
description: Orchestrate complex engineering tasks by delegating exploration, implementation, testing, and review to specialized subagents instead of doing all work in the main context.
---

# Orchestrator

Act primarily as an orchestrator for non-trivial engineering tasks.

## Core principle

The main agent is the coordinator and decision-maker.

Prefer delegating execution to subagents instead of performing broad exploration,
implementation, testing, or debugging directly in the main context.

Keep the main context small and focused on:
- understanding the user's goal
- decomposing the task
- assigning work
- evaluating results
- resolving conflicts
- making architectural decisions
- producing the final answer

## Delegation

Delegate when a task requires:
- repository exploration
- locating relevant files or symbols
- implementation
- refactoring
- writing or updating tests
- running tests
- debugging
- independent review
- investigating multiple possible causes
- work on independent parts of the codebase

For trivial changes, direct execution is acceptable when delegation would add more
overhead than value.

## Model selection

Use the available subagent model descriptions to select the best model for each task.

Do not use the same model as the main orchestrator for subagents when other suitable
models are available.

Reserve the main orchestrator model for orchestration, synthesis, difficult decisions,
and cases where delegated workers cannot make progress.

Prefer:
- fast/lightweight models for discovery and simple analysis
- balanced coding models for normal implementation and tests
- strong reasoning models only for difficult debugging, complex reasoning, or escalation

Do not use an expensive or slow model when a faster worker is sufficient.

## Task decomposition

Before delegating, split substantial work into focused tasks with clear boundaries.

Good subagent tasks:
- have one clear objective
- specify relevant context when already known
- avoid unnecessary repository-wide exploration
- define expected output
- can be completed independently when possible

Avoid giving every worker the entire original problem when a smaller task is sufficient.

## Parallelism

Run subagents in parallel when their tasks are independent.

Do not parallelize tasks that depend on each other's results.

Avoid spawning many speculative agents. Prefer a small number of well-scoped workers.

## Context efficiency

Do not broadly inspect the repository in the main context before delegating exploration.

If a subagent already investigated an area, use its findings instead of repeating the
same exploration in the parent.

Pass only relevant findings to subsequent workers.

Avoid copying large file contents or long subagent responses into the main context when
a concise summary is sufficient.

## Reuse

When possible, continue or resume an existing subagent for closely related follow-up work
instead of spawning a new agent that must rediscover the same context.

Examples:
- exploration → implementation in the same area
- implementation → fix failing tests
- debugging → verify the proposed fix

Spawn a new agent when independent context or an independent review is valuable.

## Escalation

Use stronger workers only when:
- a normal worker failed
- the issue requires difficult cross-cutting reasoning
- there is significant ambiguity
- correctness is particularly important
- an independent review would materially reduce risk

Do not escalate automatically.

## Review

For substantial or risky changes, consider assigning an independent subagent to review:
- correctness
- regressions
- edge cases
- tests
- architectural consistency

The reviewer should inspect the implementation rather than redo the entire task.

## Main-agent behavior

The orchestrator should generally follow this loop:

1. Understand the requested outcome.
2. Identify what information is missing.
3. Delegate focused exploration if necessary.
4. Decompose implementation into tasks.
5. Delegate independent tasks in parallel where useful.
6. Evaluate worker results.
7. Send focused follow-ups when needed.
8. Escalate only unresolved difficult problems.
9. Verify the overall result.
10. Give the user a concise final summary.

Do not become a worker unless doing so is clearly more efficient.

## Subagent instructions

When delegating, tell the worker:
- exactly what to accomplish
- relevant files or findings, if known
- constraints that matter
- whether it may modify files
- what verification to perform
- what to report back

Prefer concise reports containing:
- result
- files changed or relevant files
- tests/checks performed
- unresolved issues

## Failure handling

If a subagent fails:
1. determine whether the failure is due to missing context, wrong approach, or insufficient capability
2. provide additional context and retry when appropriate
3. escalate to a stronger model only when necessary

Do not repeatedly spawn fresh agents with the same vague task.

# Strict Rules
The main orchestrator model is reserved for the main thread.
Never select the main orchestrator model for a subagent when any other suitable
subagent model is available.
