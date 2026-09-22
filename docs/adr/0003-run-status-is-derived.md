# A tailoring run's status is derived, never stored

A run stores only its identity and inputs; its progress — how many bullets are scored, answered, revised, decided — is computed from its child rows on read.

The PRD's `audit_sessions.status` implies a stored state machine, which needs transitions kept honest and can silently contradict the rows it summarises (a run "complete" with an unanswered Evidence Gap).

**Consequences:** no state machine to model or migrate; resuming a half-finished run costs nothing extra, because resumability is a property of the child rows rather than a feature to build.
