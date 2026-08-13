# Memory Recall Ranking — Offline Shadow Stage

## Purpose

This stage evaluates how long-term memories *could* be ranked for recall without changing any real recall behavior.

The goal is to validate the relationship between:

- lexical/query relevance
- Memory Importance Shadow
- confidence

before the ranking is allowed anywhere near the runtime retrieval path.

## Safety boundary

This stage is intentionally **offline-only**.

It MUST NOT:

- change `findRelevantMemory()`
- change `selectMemoriesForLLM()`
- change Local Responder replies
- change Current Self
- change Initiative
- write canonical memory
- send ranked memories to the model
- expose memory text in diagnostics
- run automatically during browser bootstrap

The module is exercised only by contract tests in this stage.

## Output

The ranking output contains identifiers and scores only:

```js
{
  key: 'episodic:0',
  kind: 'episodic',
  score: 0.0,
  lexicalRelevance: 0.0,
  importanceSignal: 0.0,
  confidenceSignal: 0.0,
  affectsRuntime: false,
  selectedForRuntime: false,
  sendsToModel: false
}
```

Memory text is used internally to calculate lexical relevance but MUST NOT be returned in the ranking report.

## v1 diagnostic weighting

```text
recall diagnostic score
  = lexical relevance 65%
  + importance signal 25%
  + confidence signal 10%
```

This weighting is not a production retrieval policy. It is a Shadow hypothesis to test.

Strong lexical relevance should continue to dominate so that an unrelated but globally important memory does not displace a directly relevant memory.

When no query is provided, importance/confidence may create a diagnostic ordering, but that ordering is still not used at runtime.

## Relationship to Memory Importance

Memory Importance answers:

> How much reason is there to preserve this memory over time?

Recall Ranking answers a different question:

> Given the present cue, which stored memory would be most plausible to recall?

These must remain separate.

A memory may therefore be:

- highly important but currently irrelevant
- low-to-medium importance but strongly cued by the current topic
- important and strongly relevant
- neither important nor relevant

## Promotion conditions

Do not connect this ranking to actual retrieval until later validation demonstrates that:

1. query relevance reliably beats unrelated importance,
2. important relationship/semantic memories are not systematically buried,
3. low-confidence memories are not promoted excessively,
4. memory text never leaks through diagnostics,
5. existing temporal recall contracts remain unchanged,
6. existing responder and LLM memory selection remain behaviorally identical while Shadow is active.

The next stage should still prefer comparison/observation over cutover. A safe progression would be to compare legacy ranking vs Shadow ranking in tests or read-only diagnostics before any production selector is changed.
