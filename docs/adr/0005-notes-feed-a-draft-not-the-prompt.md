# Candidate notes feed a drafted answer, not the rewrite prompt

The notes a candidate pastes for a run are used to **draft an answer** to a gap question, which the candidate then edits and saves. They are never passed to the revision prompt directly.

Injecting the notes into the revision prompt would have been less code, but the invented-number guard allows any figure already present in its inputs — so a whole career narrative in the prompt would silently authorise every metric in it. A rewrite of a Geniebook bullet could then honestly claim the 20% from the Rushowl notes, and the guard would raise no objection because the number *was* in the input. Drafting keeps the candidate in the loop: the facts enter the system as something the candidate saved about one specific bullet, and the guard keeps its meaning.

**Consequences:** one extra model call per bullet the candidate chooses to draft; notes stay an input of the run rather than becoming a Story; and the Story Library that V2 wants is a promotion of these notes, not a rewrite of this path.
