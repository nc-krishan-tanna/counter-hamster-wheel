---
name: aidlc-compose
generated-by: aidlc-runner-gen
description: >
  Compose a tailored AI-DLC workflow plan - the adaptive composer reads your
  task (or a scan report), proposes the EXECUTE/SKIP stage grid that fits,
  and after your approval authors it as a scope and runs it. A typeable
  shortcut for `/aidlc compose`; the same one door, forced to the full
  composer even when a stock scope would match.
argument-hint: "[description | --report <path> | --new-scope]"
user-invocable: true
disable-model-invocation: true
---

# AI-DLC - compose a workflow plan

Force the adaptive composer on a task. This is packaging over
`/aidlc compose ...` - it does not add a second entry point; the engine
recognizes the compose request and names the composer dispatch, and the
conductor runs the same forwarding loop as `/aidlc`.

## Steps

1. Run the engine's first command, which carries none of the person's words: AI-DLC
   reads what they typed after this command, `--report <path>` and `--new-scope`
   included, from its own record:

   ```bash
   aidlc engine orchestrate next --entry compose
   ```

2. Act on the directive exactly as the `aidlc` skill's forwarding loop
   describes (the composer-dispatch print names the composer agent; render
   its proposal and hold the approve/edit/reject gate). From here the flow IS
   the `/aidlc` flow - continue its loop until the directive says stop.
