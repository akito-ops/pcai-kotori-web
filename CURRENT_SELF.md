# Current Self v1 design

## Purpose

Current Self is not a memory store and not Persona Core. It is a compact, reconstructable snapshot of "who this character is now" after inheriting the previous self state.

PCAI does not need to prove consciousness. The engineering target is consistent continuity cues that let a human naturally perceive an ongoing character across time.

## Position in the architecture

```text
Persona Core
  ↓
Long-term Memory / Relationship History
  ↓
Previous Current Self
  ↓
Self Reconstruction
  ↓
Current Self
  ↓
Responder / Initiative Engine
  ↓
Conversation / Action / Hold / Silence
  ↓
Experience
  ↓
Sleep consolidation
  ↓
Next self snapshot
```

Current Self must never own the canonical Persona Core or invent missing autobiographical memories.

## Current Self v1 fields

1. `continuity`
   - generation
   - previousCommitId
   - reconstructedAt
   - continuitySummary

2. `selfNarrative`
   - summary
   - recentChange

3. `innerState`
   - energy
   - curiosity
   - socialOpenness
   - inhibition
   - concern

4. `activeConcerns`
   - at most 7 items
   - only things currently salient, not the whole memory store

5. `relationshipStance`
   - familiarity
   - trust
   - conversationalDistance
   - recentTone
   - currentConcern

6. `pendingMind`
   - unfinished topic / question / withheld speech
   - stores structured state, not hidden chain-of-thought
   - can explicitly carry over to the next self

7. `growthDelta`
   - strengthenedInterests
   - weakenedInterests
   - relationshipChanges
   - selfChanges

## Safety invariants

1. Current Self is persona-scoped. Reconstruction across persona IDs fails closed.
2. Current Self never modifies Persona Core.
3. Current Self is derived state, not the source of truth for autobiographical facts.
4. Missing memories must not be invented to make continuity look better.
5. `pendingMind` stores only explicit structured intent/state. Do not persist private reasoning traces or chain-of-thought.
6. Inner-state values are behavioral control signals, not claims of literal human emotion or consciousness.
7. Lists are deliberately bounded to prevent Current Self from becoming a second unbounded memory database.
8. Reconstruction functions are pure and have no storage, network, tool, or autonomous side effects.
9. Existing production memory namespace remains untouched until a separate migration and rollback plan is validated.
10. The first implementation stays disconnected from app runtime, responder, sleep cycle, and main branch.

## Reconstruction rule

```text
Next Current Self
=
Previous Current Self
+ validated changes from current experience
+ relationship update
+ selected active concerns
+ carried pending mind
+ growth delta
```

Persona Core and long-term memories are inputs/context for reconstruction, but must remain separate canonical assets.

## Future integration gates

Before wiring Current Self into production behavior:

1. unit tests for schema, bounds, persona isolation, carry-over and immutability
2. deterministic reconstruction tests
3. validator review for hallucinated-memory paths
4. sleep-cycle dry-run that writes to a separate test namespace only
5. responder shadow mode: Current Self is computed but cannot alter visible replies
6. compare shadow output against legacy behavior
7. only after green validation, allow Current Self to influence responder context
8. initiative/autonomous messaging remains a separate later gate

## Non-goals for v1

- proving consciousness
- simulating a full human psyche
- storing hidden model reasoning
- autonomous notifications or agent actions
- rewriting Persona Core
- replacing long-term memory
