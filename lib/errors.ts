/** A failure the user can act on, as opposed to a bug or an outage. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
