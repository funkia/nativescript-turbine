import { Monad, Applicative } from "@funkia/jabz";

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
  lift<T1, R>(f: (t: T1) => R, m: Applicative<T1>): Applicative<R>;
  lift<T1, T2, R>(f: (t: T1, u: T2) => R, m1: Applicative<T1>, m2: Applicative<T2>): Applicative<R>;
  lift<T1, T2, T3, R>(f: (t1: T1, t2: T2, t3: T3) => R, m1: Applicative<T1>, m2: Applicative<T2>, m3: Applicative<T3>): Applicative<R>;
  lift(f: Function, ...ms: any[]): Monad<any> {
    const { of } = ms[0];
    switch (f.length) {
      case 1:
        return ms[0].map(f);
      case 2:
        return ms[0].chain((a: any) => ms[1].chain((b: any) => of(f(a, b))));
      case 3:
        return ms[0].chain((a: any) => ms[1].chain((b: any) => ms[2].chain((c: any) => of(f(a, b, c)))));
    }
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