import { Monad } from "@funkia/jabz";

abstract class AbstractMonad<A> {
  abstract multi: boolean;
  abstract of<B>(b: B): Monad<B>;
  chain<B>(f: (a: A) => Monad<B>): Monad<B> {
    return this.map(f).flatten();
  }
  flatten<B>(): Monad<B> {
    return this.chain((b: any) => b);
  }
  map<B>(f: (a: A) => B): Monad<B> {
    return this.chain((a: A) => this.of(f(a)));
  }
  mapTo<B>(b: B): Monad<B> {
    return this.chain((_) => this.of(b));
  }
  ap<B>(m: Monad<(a: A) => B>): Monad<B> {
    return m.chain((f) => this.chain((a) => this.of(f(a))));
  }
}

export function monad(constructor: Function): void {
  const p = constructor.prototype;
  if (!("of" in p)) {
    throw new TypeError("Can't derive monad. `of` method missing.");
  }
  
  if (!("chain" in p) && !("flatten" in p && "map" in p)) {
    throw new TypeError("Can't derive monad. Either `chain` or `flatten` and `map` method must be defined.");
  }
  if (!("multi" in p)) {
    p.multi = false;
  }
  if (!("multi" in constructor)) {
    (<any>constructor).multi = false;
  }
  mixin(constructor, [AbstractMonad]);
}

function mixin(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (!(name in derivedCtor) && !(name in derivedCtor.prototype)) {
        derivedCtor.prototype[name] = baseCtor.prototype[name];
      }
    });
  });
}