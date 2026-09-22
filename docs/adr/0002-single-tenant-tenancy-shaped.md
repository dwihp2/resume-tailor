# V1 is single-tenant but tenancy-shaped

One seeded local user, no signup, no login, no auth sessions. Every table still carries `owner_id` and every query filters on it.

The PRD models a multi-tenant SaaS, but a deadline-bounded V1 with exactly one real user cannot justify an auth surface — and the interesting risk in this product is the tailoring loop, not password hashing. Keeping `owner_id` everywhere makes the SaaS step additive rather than a migration of every table and query.

**Consequences:** the SaaS template is V2 work. A future reader will find a `users` table with a single row and no login path — that is deliberate, not an oversight.
