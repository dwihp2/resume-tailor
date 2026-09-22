# "TypeSafe Jev" is retired as terminology

The PRD's `TypeSafe Jev`, `jev_raw_output`, and `jev_extracted_facts` are replaced by **Feature Extraction** and **JD Requirements**.

The term has no referent: an exhaustive search found no spec, package, module, or repository implementing it anywhere; it appears only in the PRD that named it, and that document never defines it — it is a label for a concept, not a system being integrated.

**Consequences:** the code deliberately does not match the PRD's wording in §1, §3.2, and §4. Do not reintroduce the name to "fix" that mismatch; the deterministic-scoring idea it gestured at lives on in ADR-0001 and `lib/score`.
