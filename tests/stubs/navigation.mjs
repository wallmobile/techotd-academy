// redirect()/notFound() throw in the real framework; do the same so tests
// can assert on where a guard sent the caller.
export class RedirectSignal extends Error {
  constructor(location) {
    super(`NEXT_REDIRECT:${location}`);
    this.location = location;
  }
}
export class NotFoundSignal extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}
export function redirect(location) {
  throw new RedirectSignal(location);
}
export function notFound() {
  throw new NotFoundSignal();
}
