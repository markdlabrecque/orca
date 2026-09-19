# Per-project default agent contribution status

Last updated: 2026-09-19

## Current status

Waiting for maintainer direction before implementation.

Issue: [#16913, Main Agent Settings by Project](https://github.com/stablyai/orca/issues/16913)

Proposed scope comment: [issuecomment-5743933279](https://github.com/stablyai/orca/issues/16913#issuecomment-5743933279)

Related older request: [#7257, per-project agent overrides](https://github.com/stablyai/orca/issues/7257)

A clarification was posted on the closed request because it was marked completed even though the setting appears absent: [issuecomment-5743732519](https://github.com/stablyai/orca/issues/7257#issuecomment-5743732519)

Do not start implementation until a maintainer responds on either issue or the user decides to proceed without explicit approval.

## Proposed behavior

- Explicit launch choice wins.
- Otherwise use a valid project preference.
- An unset project preference inherits the valid global preference.
- Existing detected-agent selection remains the final fallback.
- Projects may explicitly select Blank Terminal.
- Keep Source Control AI and other action-specific agent settings independent.
- Support git and folder projects on local, SSH, WSL, and paired remote hosts.
- Retain unavailable project choices, show their status, and fall back safely.
- Require a runtime capability for remote writes so an older host cannot silently discard the setting.

The detailed implementation plan is in [`01-per-project-default-agent.md`](./01-per-project-default-agent.md).

## Contribution strategy

Keep #16913 as the only feature issue. If maintainers approve the proposal, open an ordered stack rather than one large PR:

1. Add the project preference contract, normalization, persistence, identity migration, IPC/RPC schemas, remote capability, and tests. This PR should not change visible behavior.
2. Add the central effective-agent resolver and update runtime and renderer launch paths. With no settings UI yet, ordinary profiles keep their current behavior.
3. Add the Project Settings control, search metadata, unavailable and mixed-version states, component tests, and screenshots. Only this PR should use `Fixes #16913`; earlier PRs should say `Part of #16913`.

Open the complete stack together and document the review order. Keep the setting hidden until all launch paths use the same resolver.

## Evidence behind the strategy

Repository guidance asks for small, focused PRs, cross-platform and remote compatibility, tests, and before/after proof for UI changes.

Relevant merged examples:

- [#21524](https://github.com/stablyai/orca/pull/21524) landed a five-file behavior-neutral foundation before the feature.
- [#21525](https://github.com/stablyai/orca/pull/21525) and [#21526](https://github.com/stablyai/orca/pull/21526) split backend and UI work after replacing a 137-file PR with a focused stack.
- [#16920](https://github.com/stablyai/orca/pull/16920) told reviewers to inspect successive stack layers separately.
- [#21438](https://github.com/stablyai/orca/pull/21438) was a complete 16-file settings change, but it needed several review rounds for behavior, localization, UI, and scope findings.
- [#21509](https://github.com/stablyai/orca/pull/21509) was a 41-file cross-host change with 14 commits and several review rounds.

Large PRs do merge, including work from outside collaborators, but recent merged work is dominated by a few repeat contributors. That makes a smaller stack the safer choice for a new contribution.

## Resume checklist

1. Read new replies on #16913 and #7257.
2. Record any maintainer changes to scope or precedence here and in the implementation plan.
3. If approved, refresh the branch from `main` and re-check the named source files because this repository changes quickly.
4. Implement the stack from the bottom up, keeping each PR independently testable.
5. Follow `.github/CONTRIBUTING.md`, `.github/pull_request_template.md`, `AGENTS.md`, `docs/STYLEGUIDE.md`, and `docs/reference/remote-wire-compatibility.md`.
6. Do not include unrelated existing worktree changes in commits.

## Worktree note

At the time this file was written, these unrelated files were already modified and must not be touched or committed as part of this feature:

- `mobile/scripts/repro-worktree-startup-stream.ts`
- `src/main/runtime/runtime-worktree-startup-readiness.ts`

The repository ignores `docs/**`, so this status file and the implementation plan remain local unless deliberately force-added.
