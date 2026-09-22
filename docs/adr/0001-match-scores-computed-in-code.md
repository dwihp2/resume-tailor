# Match Scores are computed in code, not returned by the model

A bullet's Match Score is produced by a pure function over its Feature Extraction and the JD's extracted Requirements. The LLM extracts facts; it never emits the score.

We rejected the cheaper alternative — letting the model return `relevanceScore` inside a Zod schema — because a strict schema guarantees the *shape* of the number, not its stability. The same resume and JD would score differently on reload, and no one could answer "why 63?".

**Consequences:** scores are reproducible and explainable (matched terms plus an evidence bonus), `lib/score` is unit-testable with no LLM in the loop, and every stored score carries the scoring version that produced it so re-scoring stays traceable.
