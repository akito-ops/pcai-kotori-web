# Memory Importance Engine — Shadow Mode

## Purpose

PCAI should not forget memories merely because they are old. Time decay should depend on whether a memory still has reasons to remain salient.

The design separates:

- memory existence: whether the memory is still stored
- memory importance: how significant the memory is
- current salience: how strongly the memory should influence recall, Current Self, Pending Mind, or Initiative now
- forgetting decision: whether a later consolidation process may compress, integrate, or discard it

These are not the same thing.

## Core model

```text
Stored Memory
  ↓
Memory Importance Engine
  ↓
importanceScore
importanceReasons
decayResistance
  ↓
Time Decay
  ↓
Effective Salience
  ↓
Recall / Current Self / Initiative / Forgetting candidate
```

A memory can remain stored while its current salience becomes low.

## Shadow Mode safety boundary

The first implementation is read-only.

- It does not rewrite canonical long-term memory.
- It does not overwrite existing `importance` fields.
- It does not delete memories.
- It does not emit messages.
- It does not enable autonomous actions.
- Diagnostic output contains scores and reason codes, not memory text.

Existing `importance` is treated as one compatibility signal, not as unquestionable truth.

## Importance components

The initial deterministic evaluator uses explainable signals only.

### storedSignal

Existing memory `importance`, when present. This preserves compatibility with the current memory system.

### typeSignificance

A bounded prior based on memory kind.

- episodic: ordinary shared event
- semantic: user-specific knowledge
- relationship: relationship history
- procedural: recurring tendencies or rules
- pending: unresolved withheld intention

The kind prior is a weak prior, not a final judgment.

### confidence

How reliable the stored memory is believed to be. Low-confidence memories should not gain high durable importance merely because they are old or repeated.

### recurrence

Whether similar themes appear repeatedly across stored memories. Repeated shared themes can become more important over time.

### currentRelevance

Whether the memory reconnects with the current Current Self concerns. Old memories may temporarily regain salience when the present conversation makes them relevant again.

### unresolvedness

Pending intentions that remain held or unresolved receive an importance signal because unfinished matters naturally persist longer than completed trivial matters.

### relationshipSignificance

Relationship memories receive an explicit relationship component because they help define the shared history between the user and PCAI.

### personalSignificance

Semantic and procedural user knowledge receives a personal component because stable user-specific knowledge often deserves more resistance to decay than incidental episodic detail.

## Outputs

Each assessment returns:

```text
importanceScore: 0.0–1.0
decayResistance: 0.0–1.0
reasons: reason codes
components: individual bounded signals
```

No memory body is included in diagnostics.

## Importance is not permanent

Importance must remain revisable.

A memory can become more important when:

- it recurs repeatedly
- it becomes relevant to Current Self again
- it becomes part of relationship history
- an unresolved issue remains active

A memory can become less salient when:

- it stops recurring
- it is no longer relevant
- an unresolved matter is completed
- time passes without renewed significance

The stored memory does not need to be deleted for its current influence to decline.

## Importance-aware decay

The previous Pending Mind decay model used chronological age directly.

The new Shadow model uses:

```text
chronological age
  × importance-dependent aging multiplier
  = effective age
```

High `decayResistance` slows effective aging but never stops time entirely.

This means two memories created on the same day can decay differently.

Example:

```text
low importance pending
12 chronological days
→ effective age remains old
→ discard_candidate

high importance pending
12 chronological days
→ effective age is much younger
→ stale, still influential
```

A currently relevant memory may also regain a bounded salience boost.

## Design principle

> PCAI should not forget because a calendar threshold was crossed. A memory should fade because the reasons for keeping it salient have weakened over time.

## Future stages

After Shadow evaluation is validated:

1. use importance-aware decay for long-term recall ranking
2. distinguish durable importance from transient salience
3. update importance after repeated recall and shared reinterpretation
4. let sleep consolidation choose among keep / summarize / integrate / discard
5. keep all destructive forgetting decisions separately gated and auditable

No automatic deletion is introduced by this stage.
