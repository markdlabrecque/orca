# Pi Chat UI planning

Status: discussion draft. No GitHub issues have been created and no implementation has started.

Target issue repository, when approved: https://github.com/markdlabrecque/orca

## Goal

Make Pi another provider for Orca's existing Chat UI, with an experience comparable to Claude and Codex. Show conversation history, streaming responses, current tool calls and output, and whether the agent is working or waiting for input.

This is intentionally a pared-down Pi experience. We do not need to reproduce Pi's terminal UI, custom editors, dashboards, widgets, or every extension's presentation.

Implementation tasks should be small and explicit enough to hand to a Luna agent. Publish them only after the user approves the scope and breakdown.

## Agreed decisions

- Use Pi's RPC mode through Orca's existing structured-session infrastructure, rather than driving a terminal or building a separate chat system.
- Use the Pi installation on the execution host, with its existing credentials, settings, and extensions, subject to RPC compatibility and project trust.
- Do not bundle a separate Pi runtime or copy credentials to the client.
- The MVP starts new Pi conversations in Orca and reopens conversations created there, restoring history and allowing continuation.
- Show messages, streaming responses, tool calls and output, and agent activity/status.
- Support send, stop, model/thinking selection, and standard extension dialogs within the overall MVP.
- Defer browsing/importing arbitrary existing Pi sessions, taking over an already-running Pi terminal, and full session-tree navigation.
- Custom TUI rendering is outside scope. Non-UI extension logic can still run, but arbitrary extensions are not guaranteed to work in RPC mode.

Reopening a saved conversation is different from attaching to a live terminal process. The latter needs a handover mechanism and is not part of this implementation.

## Proposed round-one boundaries, not yet approved

The latest proposed breakdown narrows the first implementation round within the overall MVP:

- Start with host-local execution.
- Keep direct SSH and WSL explicitly unavailable until separately implemented and verified. Never substitute client-local execution for a remote target.
- Treat paired-server support separately from direct SSH. Pi can execute locally to a paired server, but that route still needs validation before being advertised.
- Use Pi's configured model and thinking defaults initially. Add model/thinking controls and command discovery in round two.
- Include standard extension dialogs in round one so extensions can ask for input without leaving an unanswerable wait.

The user has not approved these narrower boundaries or the six-ticket breakdown below. They requested this document to think further before creating tickets.

## Alternatives considered

### Chat over an existing Pi terminal

This would preserve the running TUI and allow switching back for custom extensions. It would also require terminal-compatible input delivery, dialog handling, and live-state tracking.

Orca already has a terminal-backed chat path, but Pi is not currently in its supported-agent set. OMP's transcript decoder offers some reusable concepts, not a drop-in Pi implementation. It explicitly ignores session branches, which would render abandoned history incorrectly for Pi's tree workflow.

### Pi RPC through structured sessions

This is the preferred approach for the agreed pared-down experience. Pi exposes structured messages, tool events, model selection, queues, history, and standard extension interactions. Orca supplies the presentation and durable session management.

There is no simultaneously running Pi TUI to switch back to. Custom terminal interfaces do not carry over automatically.

Embedding Pi's SDK was identified as an available integration option but was not investigated in comparable depth. The agreed direction uses the installed CLI through RPC.

## Contract investigation

The investigation read Orca's structured-session adapter contract, the Claude and Codex implementations, shared journal and provider-handle types, launch gates, and Pi's installed RPC documentation and implementation. The inspected Pi package was version 0.86.1. This is an inspected version, not an established minimum supported version.

No app was launched and no runtime compatibility proof was performed. The following findings are based on source and documentation inspection.

### Direct mappings

| Orca contract or behavior | Pi equivalent | Assessment |
| --- | --- | --- |
| Acquire a session | Launch `pi --mode rpc`, read state | Fits with Pi-specific process and session setup |
| Dispatch a message | `prompt` | Fits, with careful acceptance tracking |
| Stream messages | Message start/update/end events | Existing message rendering can be reused |
| Show tool activity | Tool execution start/update/end events | Existing tool-call items cover the core experience |
| Read/set options | Model and thinking commands | Choices can come from the installed Pi |
| Discover commands | `get_commands` | Reports extension commands, templates, and skills |
| Answer a prompt | `extension_ui_response` | Standard selectors and confirmations fit existing concepts |
| Reopen and recover history | Session file and `get_entries` | Pi supports it; Orca needs provider-specific recovery mapping |

Built-in TUI slash commands are not all available through RPC prompt submission. Command discovery must not imply that every terminal command can be sent unchanged.

### Provider registration is broader than one adapter

Structured provider handles, launch paths, persistence validators, journal identities, and tab restoration currently contain explicit Claude/Codex assumptions. Pi support must extend those paths deliberately.

The existing chat render models already cover messages, tool calls, status, turns, approvals, and questions. The main work is session correctness and provider integration rather than inventing new presentation components.

New persisted or published provider values also need mixed-version handling. An older client or host must not mistake Pi for Codex, reject an unrelated listing wholesale, or silently offer an unsupported operation.

### Live messages and saved entries have different identity information

Pi's saved entries have stable IDs and parent relationships. Its documented live message events do not expose those saved entry IDs.

Before implementation proceeds, prove how live messages become durable Orca journal items and reconcile against saved history. Tests must include repeated identical prompts, not just unique text that can be matched heuristically.

Reopening must not duplicate messages, confuse branches, or invent certainty about whether a send was accepted. Deferring tree navigation does not remove the need to render the correct active history.

Pi's successful `prompt` response means accepted, queued, or handled by an extension. It does not necessarily mean a conversation turn started. Orca distinguishes admission, acceptance, rejection, and unknown delivery; the adapter must preserve that distinction.

### Turn completion and cancellation need translation

Pi's low-level `agent_end` may be followed by retry, compaction, or queued continuation. `agent_settled` reports full settlement in the inspected version. Do not treat the first end event as successful completion.

Orca's cancellation contract targets the specific turn the user asked to stop. Pi's `abort` is session-wide, and queued messages may continue unless cleared. The adapter needs guarded cancellation and an explicit policy for messages submitted while busy.

Do not let a delayed Stop cancel a subsequent response. Do not automatically resend a prompt after uncertain delivery.

### Standard extension dialogs need some shared-model work

Pi RPC exposes select, confirm, input, and editor requests. Orca already has option selection and a free-text answer transport.

Gaps to resolve:

- Pi's multiline editor can include prefilled text; the current question model does not represent that directly.
- Pi dialogs can expire or be cancelled internally without an explicit close event in the inspected RPC implementation.
- Late answers must not appear successful if Pi is no longer waiting.
- Competing clients must not answer the same prompt twice.
- Cancellation and empty text need explicit behavior rather than accidental validation rules.

Pi RPC's `custom()` returns `undefined`. Custom editor/footer/header components and several terminal-specific methods are unavailable or no-ops. The UI must not promise arbitrary extension compatibility.

### Execution-host coverage is not automatic

Both inspected structured adapters gate execution to host-local, non-WSL processes. The shared launch policy also blocks direct remote execution hosts.

This corrects the initial assumption that reusing structured adapters would automatically provide SSH and WSL coverage. Those execution paths need separate scope and verification.

A paired Orca server differs from direct SSH because it owns its runtime and can launch Pi locally to itself. That does not establish that the complete Pi creation, restore, and client capability path already works.

Loss of contact must remain `unverifiable`, never evidence of `exited`. The execution host owns processes, credentials, environment, artifacts, and execution status. Folder workspaces must work without assuming Git worktrees.

## Proposed first-round development tasks

These are candidate issues, not approved or published tickets. Numbers below are local planning references, not GitHub issue numbers.

### 1. Prove Pi RPC message identity and session recovery

Blocked by: none.

Deliver a repeatable integration proof and a short decision record showing how live messages map to saved entries and how an Orca-created session can reopen safely.

Acceptance targets:

- Exercise message streaming, saved entries, interruption, and reopening with real Pi.
- Include repeated identical prompts and multiple tool calls.
- Distinguish prompt admission from a started conversation turn and from an extension command handled without a turn.
- Identify how active history and its durable cursor are established.
- Document what can and cannot be proven after an interrupted send.
- Record the tested version and propose a supported minimum based on evidence, not the installed version alone.
- Avoid exposing credentials or private conversations in fixtures.

Stop and escalate if a reliable identity/recovery mapping requires a Pi protocol change. Do not substitute text matching or optimistic resend for proof.

This is the main uncertainty-reduction task and an intentional exception to user-visible feature slicing.

### 2. Start a Pi conversation in Orca Chat UI

Blocked by: 1.

Deliver an experimental end-to-end path that launches installed Pi, sends a prompt, and displays streaming text in the existing Chat UI.

Acceptance targets:

- Register Pi throughout structured-session creation, provider handles, persistence validation, and launch routing as needed.
- Use existing ownership, lease, journal, and status infrastructure rather than parallel Pi stores.
- Use host configuration and credentials while preserving Pi's project-trust behavior.
- Fail clearly when Pi is absent, incompatible, or the execution location is unsupported.
- Handle acquisition failures without leaving an unowned child process.
- Keep Claude and Codex paths working.
- Keep the feature experimental; later tasks complete cancellation, recovery, and dialogs before release validation.

### 3. Show Pi tool activity and stop the current response safely

Blocked by: 2.

Deliver tool calls with running/completed/failed state, bounded output, and correct working/completion status. Add safe Stop behavior.

Acceptance targets:

- Preserve tool-call identity while output changes.
- Distinguish output deltas from cumulative tool output.
- Publish through the durable journal and existing host-owned status path.
- Handle retries, compaction, provider errors, and final settlement without falsely reporting success.
- Stop targets the requested response and cannot cancel a later response.
- Define and test busy-send/queue behavior, including what happens to queued messages when Stop is pressed.
- Respect event-sink backpressure and output bounds.

### 4. Reopen Orca-created Pi chats without duplicating work

Blocked by: 3.

Deliver restored history and continuation of the same Orca-created conversation after normal closure or interruption.

Acceptance targets:

- Restore the correct active history without duplicate message or tool rows.
- Preserve session identity and avoid duplicate tabs.
- Enforce one Orca-owned writer for a session.
- Cover runtime restart and interrupted acquisition or send.
- Leave an uncertain send unconfirmed instead of resending automatically.
- Require process-exit evidence before releasing ownership or starting a replacement.
- Work for folder workspaces as well as Git worktrees.

Does not import arbitrary sessions or take over an already-running TUI.

### 5. Answer standard Pi extension dialogs in Chat UI

Blocked by: 3.

Deliver selectors, confirmations, free-text input, and a basic multiline editor using Orca's existing question/approval mechanisms where possible.

Acceptance targets:

- Map answers to the exact live Pi request.
- Support editor prefill without replacing unrelated user drafts accidentally.
- Handle dismissal, internal cancellation, expiry, and late answers explicitly.
- Prevent double answers from competing clients.
- Clear stale cards when the owning session ends.
- Keep unsupported custom TUI behavior explicit.
- Use additive, compatible shared-model changes where additional metadata is necessary.

If RPC cannot provide enough evidence to dismiss or acknowledge a dialog safely, record the limitation and escalate instead of inventing success.

### 6. Validate and gate the first Pi Chat UI release

Blocked by: 4 and 5.

Deliver verification of the complete round-one flow and clear availability gates and limitations.

Acceptance targets:

- Exercise create, stream, tool execution, stop, questions, reopen, and failure recovery together.
- Verify supported native platforms using appropriate local/CI environments; do not claim coverage from source inspection alone.
- Verify missing/old Pi behavior and mixed Orca client/host versions.
- Confirm direct SSH and WSL remain unavailable if they are not included in the approved round.
- Validate paired-server behavior separately before advertising it.
- Check cleanup and ownership after unexpected process exit or transport loss.
- Regress Claude and Codex behavior where shared contracts changed.
- Document installation requirements, RPC extension limitations, and deferred features.

## Proposed next round and roadmap

Within the overall MVP, but proposed for round two:

- Model/provider and thinking controls, using live Pi catalogs rather than hardcoded choices.
- Command discovery for extensions, templates, and skills.

Separate roadmap candidates:

- Browse and import existing saved Pi sessions.
- Direct SSH and WSL structured execution.
- Additional paired-server work if verification exposes gaps.
- Live terminal-to-chat handover.
- Full session-tree navigation and branching controls.

Custom TUI rendering is not a commitment.

## Instructions for eventual agent-ready issues

Each issue should contain:

- A short explanation of the user-visible result and why the work is needed.
- Explicit blockers and exclusions.
- Existing mechanisms to reuse, described by responsibility rather than instructions to duplicate another provider wholesale.
- Concrete acceptance criteria and failure/race tests.
- Compatibility requirements for shared persistence and remote publications.
- Clear escalation conditions for unresolved protocol or ownership questions.

Agents should not decide product scope or invent recovery guarantees while implementing. Task 1 should settle the identity approach before later tasks depend on it.

Use the fork explicitly when publishing. Apply native dependency relationships where available. Open no PR without its ticket reference, and prefix each PR title with that reference followed by a colon and space.

## Validation and implementation constraints

- Follow the repository's reuse-before-reimplementation rule.
- UI changes follow `docs/STYLEGUIDE.md` and existing components/tokens.
- Tests and agent-launched apps use `ORCA_BACKGROUND_LAUNCH=1`. Run them in the background and never show or focus test windows on the user's desktop.
- Use hidden-renderer Playwright CDP checks for Orca UI validation. Native-focus tests belong on an isolated display or CI.
- Use existing cross-platform child-process APIs and process-exit verification. Do not add direct Windows child-process launching or assume POSIX paths/signals.
- Read the execution-boundary, agent-status-store, and remote-wire compatibility references before changing those mechanisms.
- Keep output and event buffering bounded.
- Keep unknown delivery and unknown process state visible rather than treating them as success, failure, or permission to retry.

## Code and documentation starting points

These paths record where the investigation found relevant behavior. Recheck them when implementation starts; they are not a prescribed edit list.

- `src/main/native-chat/agent-session-wire/structured-agent-session-adapter.ts`
- `src/main/native-chat/agent-session-wire/structured-agent-session-adapter-router.ts`
- `src/main/native-chat/agent-session-wire/structured-agent-session-event-sink.ts`
- `src/main/codex/codex-structured-session-adapter.ts`
- `src/main/claude/claude-structured-session-adapter.ts`
- `src/shared/agent-session-provider-handle.ts`
- `src/shared/agent-session-journal-types.ts`
- `src/shared/agent-session-journal-item-key.ts`
- `src/shared/agent-session-question-answer.ts`
- `src/shared/agent-session-wire.ts`
- `src/shared/structured-native-chat-launch-route.ts`
- `src/main/runtime/orca-runtime-restore-structured-agent-session-tabs-once.ts`
- `src/main/codex/codex-structured-location-support.ts`
- `src/main/claude/claude-structured-location-support.ts`
- `src/shared/native-chat-agent-support.ts`
- `src/main/native-chat/transcript-line-decoders-omp.ts`
- `tests/tools/pi-ui-prompt-verification.md`
- `docs/reference/ssh-execution-boundary.md`
- `docs/reference/agent-status-store.md`
- `docs/reference/remote-wire-compatibility.md`

Pi references inspected were the installed package's `README.md`, `docs/rpc.md`, `dist/modes/rpc/rpc-mode.js`, and `dist/modes/json-event.js`.

## Effort assessment

This is a multi-session provider integration, not a small transcript-decoder change. No defensible calendar estimate has been established.

The strongest reuse is Orca's chat presentation, journal, ownership, status publication, and option/question mechanisms. The largest uncertainty is connecting Pi's live events to durable session history and recovering interrupted delivery correctly. Proving that first should make the remaining work easier to estimate.

## Decisions still needed before issue creation

1. Approve or revise the six-task breakdown and dependencies.
2. Confirm host-local-only round one and how paired-server verification fits.
3. Confirm moving model/thinking controls and command discovery to round two within the MVP.
4. After the RPC proof, approve the identity/recovery strategy and minimum Pi version.
5. Resolve any dialog-lifecycle protocol limitations found by the proof and implementation investigation.
