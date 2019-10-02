import {
  Behavior,
  Future,
  isBehavior,
  Now,
  placeholder,
  runNow,
  sinkBehavior,
  sinkFuture,
  Stream,
  instant,
  Time
} from "@funkia/hareactive";
import { viewObserve } from "./hareactive-wrapper";
import { Monad, monad } from "@funkia/jabz";
import { copyRemaps, id, Merge, mergeObj, Showable, isShowable } from "./utils";
import { FixedDomPosition } from "./native";

const supportsProxy = typeof Proxy !== "undefined";

export interface DomApi<C = Node> {
  parent: any;
  appendChild(child: C): void;
  insertBefore(insert: C, before: C): void;
  removeChild(child: C): void;
}

export type Out<A, O> = {
  available: A;
  output: O;
};

/**
 * A component is a function from a parent DOM node to a now
 * computation I.e. something like `type Component<A> = (p: Node) =>
 * Now<A>`. We don't define it as a type alias because we want to
 * make it a monad in different way than Now.
 */
@monad
export abstract class Component<A, O> implements Monad<O> {
  static of<B>(b: B): Component<{}, B> {
    return new OfComponent(b);
  }
  of<P>(p: P): Component<{}, P> {
    return new OfComponent(p);
  }
  flatMap<B, P>(f: (o: O) => Component<B, P>): Component<A, P> {
    return new FlatMapComponent(this, f);
  }
  chain<B, P>(f: (o: O) => Component<B, P>): Component<A, P> {
    return new FlatMapComponent(this, f);
  }
  use<P>(f: (a: A) => P): Component<A, O & P>;
  use<B extends Record<string, keyof A>>(
    remaps: B
  ): Component<A, O & Remap<A, B>>;
  use(handler: any): Component<A, any> {
    if (typeof handler === "function") {
      return new HandleOutput(
        (a, o) => ({
          available: a,
          output: mergeObj(mergeObj({}, handler(a)), o)
        }),
        this
      );
    } else {
      return new HandleOutput(
        (a, o) => ({
          available: a,
          output: mergeObj(mergeObj({}, o), copyRemaps(handler, a))
        }),
        this
      );
    }
  }
  output<R>(o: R): Result<R, O> {
    return { available: o, component: this };
  }
  view(): Component<O, {}> {
    return view(this);
  }
  static multi: boolean = false;
  multi: boolean = false;
  abstract run(
    parent: DomApi<any>,
    destroyed: Future<boolean>,
    time: Time
  ): Out<A, O>;
  // Definitions below are inserted by Jabz
  flatten: <B, P>(this: Component<A, Component<B, P>>) => Component<A, P>;
  map: <P>(f: (a: O) => P) => Component<A, P>;
  mapTo: <P>(b: P) => Component<A, P>;
  ap: <P>(a: Component<A, (o: O) => P>) => Component<A, P>;
  lift: (f: Function, ...ms: any[]) => Component<A, any>;
}

class OfComponent<O> extends Component<{}, O> {
  constructor(private readonly o: O) {
    super();
  }
  run(_1: DomApi, _2: Future<boolean>): Out<{}, O> {
    return { output: this.o, available: {} };
  }
}

class PerformComponent<O> extends Component<{}, O> {
  constructor(private cb: () => O) {
    super();
  }
  run(_1: DomApi, _2: Future<boolean>): Out<{}, O> {
    return { available: {}, output: this.cb() };
  }
}

/**
 * Takes a callback, potentially with side-effects. The callback is invoked when
 * the component is run and the return value becomes the components output.
 */
export function performComponent<O>(callback: () => O): Component<{}, O> {
  return new PerformComponent(callback);
}

export function liftNow<A>(now: Now<A>): Component<{}, A> {
  return performComponent(() => runNow(now));
}

class HandleOutput<A, O, B, P> extends Component<B, P> {
  constructor(
    private readonly handler: (
      available: A,
      output: O
    ) => { available: B; output: P },
    private readonly c: Component<A, O>
  ) {
    super();
  }
  run(parent: DomApi, destroyed: Future<boolean>, t: Time): Out<B, P> {
    const { available, output } = this.c.run(parent, destroyed, t);
    return this.handler(available, output);
  }
}

/**
 * This type is sometimes useful to trick TypeScript into evaulating types
 * that it would otherwise not evaluating. This can make some types
 * significantly more readable.
 */
type Id<T extends object> = {} & { [P in keyof T]: T[P] };

export type Remap<
  A extends Record<any, any>,
  B extends Record<any, keyof A>
> = Id<{ [K in keyof B]: A[B[K]] }>;

export function use<A, O, P>(
  f: (a: A) => P,
  c: Component<A, O>
): Component<A, O & P>;
export function use<A, O, B extends Record<string, keyof A>>(
  remaps: B,
  c: Component<A, O>
): Component<A, O & Remap<A, B>>;
export function use<A>(
  remaps: any,
  component: Component<any, A>
): Component<any, A> {
  return component.use(remaps);
}

/**
 * An empty component that adds no elements to the DOM and produces an
 * empty object as output.
 */
export const emptyComponent = Component.of({});

class FlatMapComponent<A, O, B, P> extends Component<A, P> {
  constructor(
    private readonly component: Component<A, O>,
    private readonly f: (o: O) => Component<B, P>
  ) {
    super();
  }
  run(parent: DomApi, destroyed: Future<boolean>, t: Time): Out<A, P> {
    const { available, output: outputFirst } = this.component.run(
      parent,
      destroyed,
      t
    );
    const { output } = this.f(outputFirst).run(parent, destroyed, t);
    return { available, output };
  }
}

export function isComponent(c: any): c is Component<any, any> {
  return c instanceof Component;
}

type Reactive = Behavior<any> | Stream<any> | Future<any>;

export interface ReactivesObject {
  [a: string]: Reactive;
}

/**
 * Removes all properties from a type except those that are either
 * streams, behaviors, or futures.
 */
type OnlyReactives<R> = {
  [K in keyof R]: R[K] extends Reactive ? R[K] : never;
};

const placeholderProxyHandler = {
  get: function(target: any, name: string): Behavior<any> | Stream<any> {
    if (!(name in target)) {
      target[name] = placeholder();
    }
    return target[name];
  }
};

type Result<R, O> = { available: R; component: Child<O> };

function isLoopResult(r: any): r is Result<any, any> {
  return typeof r === "object" && "available" in r && "component" in r;
}

class LoopComponent<L, O> extends Component<O, {}> {
  constructor(
    private f: (
      o: L,
      start: <A>(n: Now<A>) => A
    ) => Child<L> | Now<Child<L>> | Result<O, L> | Now<Result<O, L>>,
    private placeholderNames?: (keyof L)[]
  ) {
    super();
  }
  run(parent: DomApi, destroyed: Future<boolean>, t: Time): Out<O, {}> {
    let placeholderObject: any = { destroyed };
    if (this.placeholderNames !== undefined) {
      for (const name of this.placeholderNames) {
        placeholderObject[name] = placeholder();
      }
    } else if (supportsProxy) {
      placeholderObject = new Proxy(placeholderObject, placeholderProxyHandler);
    } else {
      throw new Error(
        "component called with no list of names and proxies are not supported."
      );
    }
    const res = instant(start => this.f(placeholderObject, start)).run(t);
    const result = Now.is(res) ? res.run(t) : res;
    const { available, component } = isLoopResult(result)
      ? result
      : { available: {} as O, component: result };
    const { output: looped } = toComponent(component).run(parent, destroyed, t);
    const needed = Object.keys(placeholderObject);
    for (const name of needed) {
      if (name === "destroyed") {
        continue;
      }
      if (looped[name] === undefined) {
        throw new Error(`The property ${name} is missing.`);
      }
      placeholderObject[name].replaceWith(looped[name], t);
    }
    return { available, output: {} };
  }
}

export function component<L extends ReactivesObject>(
  f: (l: L, start: <A>(n: Now<A>) => A) => Child<L> | Now<Child<L>>,
  placeholderNames?: (keyof L)[]
): Component<{}, {}>;
export function component<L extends ReactivesObject, O>(
  f: (l: L, start: <A>(n: Now<A>) => A) => Result<O, L> | Now<Result<O, L>>,
  placeholderNames?: (keyof L)[]
): Component<O, {}>;
export function component<L, O extends ReactivesObject>(
  f: (
    l: L,
    start: <A>(n: Now<A>) => A
  ) => Child<L> | Now<Child<L>> | Result<O, L> | Now<Result<O, L>>,
  placeholderNames?: (keyof L)[]
): Component<O, {}> {
  return new LoopComponent<L, O>(f, placeholderNames);
}

class MergeComponent<
  A,
  O extends object,
  B,
  P extends object
> extends Component<{}, O & P> {
  constructor(private c1: Component<A, O>, private c2: Component<B, P>) {
    super();
  }
  run(parent: DomApi, destroyed: Future<boolean>, t: Time): Out<{}, O & P> {
    const res1 = this.c1.run(parent, destroyed, t);
    const res2 = this.c2.run(parent, destroyed, t);
    return {
      available: {},
      output: mergeObj(mergeObj({}, res2.output), res1.output)
    };
  }
}

/**
 * Merges two components. Their selected output is combined.
 */
export function merge<O extends object, A, P extends object, B>(
  c1: Component<A, O>,
  c2: Component<B, P>
): Component<{}, O & P> {
  return new MergeComponent(c1, c2);
}

function addErrorHandler(modelName: string, viewName: string, obj: any): any {
  if (modelName === "") {
    modelName = "anonymous";
  }
  if (viewName === "") {
    viewName = "anonymous";
  }
  if (!supportsProxy) {
    return obj;
  }
  return new Proxy(obj, {
    get(object: any, prop: string): any {
      if (prop in obj) {
        return object[prop];
      }
      throw new Error(
        `The model, ${modelName}, expected a property "${prop}" but the view, ${viewName}, returned an object without the property.`
      );
    }
  });
}

class ModelViewComponent<M extends Record<string, any>, V> extends Component<
  M,
  {}
> {
  constructor(
    private args: any[],
    private model: (...as: any[]) => Now<M>,
    private viewF: (...as: any[]) => Child<V>,
    private placeholderNames?: string[]
  ) {
    super();
  }
  run(parent: DomApi, destroyed: Future<boolean>, t: Time): Out<M, {}> {
    const { viewF, model, args } = this;
    let placeholders: any;
    if (supportsProxy) {
      placeholders = new Proxy({}, placeholderProxyHandler);
    } else {
      placeholders = {};
      if (this.placeholderNames !== undefined) {
        for (const name of this.placeholderNames) {
          placeholders[name] = placeholder();
        }
      }
    }
    const { output: viewOutput } = toComponent(
      viewF(placeholders, ...args)
    ).run(parent, destroyed, t);
    const helpfulViewOutput = addErrorHandler(
      model.name,
      viewF.name,
      Object.assign(viewOutput, { destroyed })
    );
    const behaviors = runNow(model(helpfulViewOutput, ...args));
    // Tie the recursive knot
    for (const name of Object.keys(behaviors)) {
      placeholders[name].replaceWith(behaviors[name]);
    }
    return { available: behaviors, output: {} };
  }
}

export type Model<V, M> = (v: V) => Now<M>;
export type Model1<V, M, A> = (v: V, a: A) => Now<M>;
export type View<M, V> = (m: OnlyReactives<M>) => Child<V>;
export type View1<M, V, A> = (m: OnlyReactives<M>, a: A) => Child<V>;

export function modelView<M extends Record<string, any>, V>(
  model: Model<V, M>,
  view: View<M, V>,
  toViewReactiveNames?: string[]
): () => Component<M, {}>;
export function modelView<M extends Record<string, any>, V, A>(
  model: Model1<V, M, A>,
  view: View1<M, V, A>,
  toViewReactiveNames?: string[]
): (a: A) => Component<M, {}>;
export function modelView<M extends Record<string, any>, V>(
  model: any,
  view: any,
  toViewReactiveNames?: string[]
): (...args: any[]) => Component<M, {}> {
  return (...args: any[]) =>
    new ModelViewComponent<M, V>(args, model, view, toViewReactiveNames);
}

export function view<O>(c: Component<any, O>): Component<O, {}> {
  return new HandleOutput((_, o) => ({ available: o, output: {} }), c);
}

// Child element
export type CE<O = any> =
  | Component<any, O>
  | Behavior<Component<any, any>>
  | Showable
  | Behavior<Showable>
  | ChildList;

// Union of the types that can be used as a child. A child is either a
// component or something that can be converted into a component. This
// type is not recursive on tuples due to recursive type aliases being
// impossible.
export type Child<O = any> =
  | [CE]
  | [CE, CE]
  | [CE, CE, CE]
  | [CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE]
  | [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE] // 12
  | CE<O>;

// A dummy interface is required since TypeScript doesn't handle
// recursive type aliases
// See: https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
export interface ChildList extends Array<CE> {}

/**
 * Takes a component type and returns the selected output of the component.
 */
export type ComponentSelectedOutput<C> = C extends Component<any, infer O>
  ? O
  : never;

/**
 * Takes a component type and returns the output of the component.
 */
export type ComponentOutput<C> = C extends Component<any, infer A> ? A : never;

export type ChildSelectedOutput<Ch extends Child> = ComponentSelectedOutput<
  ToComponent<Ch>
>;

// Merge component
export type MC<C1 extends CE, C2 extends CE> = Component<
  ComponentSelectedOutput<TC<C1>> & ComponentSelectedOutput<TC<C2>>,
  Merge<ComponentSelectedOutput<TC<C1>> & ComponentSelectedOutput<TC<C2>>>
>;

// prettier-ignore
export type ArrayToComponent<A extends Array<Child>> =
  A extends [CE] ? TC<A[0]> :
  A extends [CE, CE] ? MC<A[0], A[1]> :
  A extends [CE, CE, CE] ? MC<A[0], MC<A[1], A[2]>> :
  A extends [CE, CE, CE, CE] ? MC<A[0], MC<A[1], MC<A[2], A[3]>>> :
  A extends [CE, CE, CE, CE, CE] ? MC<A[0], MC<A[1], MC<A[2], MC<A[3], A[4]>>>> :
  A extends [CE, CE, CE, CE, CE, CE] ? MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], A[5]>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], A[6]>>>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], MC<A[6], A[7]>>>>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], MC<A[6], MC<A[7], A[8]>>>>>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], MC<A[6], MC<A[7], MC<A[8], A[9]>>>>>>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], MC<A[6], MC<A[7], MC<A[8], MC<A[9], A[10]>>>>>>>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], MC<A[6], MC<A[7], MC<A[8], MC<A[9], MC<A[10], A[11]>>>>>>>>>>>> :
  A extends [CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE, CE] ? TC<MC<A[0], MC<A[1], MC<A[2], MC<A[3], MC<A[4], MC<A[5], MC<A[6], MC<A[7], MC<A[8], MC<A[9], MC<A[10], MC<A[11], A[12]>>>>>>>>>>>>> :
  Component<any, any>;

export type TC<A> = A extends Component<any, infer O>
  ? Component<{}, O>
  : A extends Showable
  ? Component<{}, {}>
  : A extends Behavior<Showable>
  ? Component<{}, {}>
  : Component<any, any>;

export type ToComponent<A> = A extends Child[] ? ArrayToComponent<A> : TC<A>;

export function isChild(a: any): a is Child {
  return isComponent(a) || isBehavior(a) || isShowable(a) || Array.isArray(a);
}

class TextComponent extends Component<{}, {}> {
  constructor(private text: Showable) {
    super();
  }
  run(api: DomApi<Showable>, destroyed: Future<boolean>) {
    api.appendChild(this.text);
    return {
      available: {},
      output: {}
    };
  }
}

export function text(show: Showable) {
  return new TextComponent(show);
}

class ListComponent extends Component<any, any> {
  components: Component<any, any>[];
  constructor(children: Child[]) {
    super();
    this.components = [];
    for (const child of children) {
      const component = toComponent(child);
      this.components.push(component);
    }
  }
  run(parent: DomApi, destroyed: Future<boolean>, t: Time): Out<any, any> {
    let output: Record<string, any> = {};
    for (let i = 0; i < this.components.length; ++i) {
      const component = this.components[i];
      const res = component.run(parent, destroyed, t);
      mergeObj(output, res.output);
    }
    return { available: output, output };
  }
}

export function toComponent<A extends Child>(child: A): ToComponent<A> {
  if (isComponent(child)) {
    return child as any;
  } else if (isShowable(child)) {
    return text(child) as any;
  } else if (isBehavior(child)) {
    return dynamic(child).mapTo({}) as any;
  } else if (Array.isArray(child)) {
    return new ListComponent(child) as any;
  } else {
    throw new Error(
      "Child could not be converted to component " + typeof child
    );
  }
}

class DynamicComponent<O> extends Component<Behavior<O>, {}> {
  constructor(private behavior: Behavior<Child<O>>) {
    super();
  }
  run(
    parent: DomApi<any>,
    dynamicDestroyed: Future<boolean>,
    t: Time
  ): Out<Behavior<O>, {}> {
    let destroyPrevious: Future<boolean>;
    const parentWrap = new FixedDomPosition(parent, dynamicDestroyed);

    const available = this.behavior.map(child => {
      if (destroyPrevious !== undefined) {
        destroyPrevious.resolve(true);
      }
      destroyPrevious = sinkFuture<boolean>();
      const { output } = toComponent(child).run(
        parentWrap,
        destroyPrevious.combine(dynamicDestroyed),
        t
      );
      return output;
    });
    // To activate behavior
    viewObserve(id, available, t);

    return { available, output: {} };
  }
}

export function dynamic<O>(
  behavior: Behavior<Component<any, O>>
): Component<Behavior<O>, {}>;
export function dynamic<O>(
  behavior: Behavior<Child<O>>
): Component<Behavior<O>, {}>;
export function dynamic<O>(
  behavior: Behavior<Child<O>>
): Component<Behavior<O>, {}> {
  return new DynamicComponent(behavior);
}

class DomRecorder<A> implements DomApi<A> {
  elms: A[] = [];
  parent: any;
  constructor(private api: DomApi<A>) {
    this.parent = api.parent;
  }
  appendChild(child: A): void {
    this.api.appendChild(child);
    this.elms.push(child);
  }
  insertBefore(a: A, b: A): void {
    this.api.insertBefore(a, b);
    const index = this.elms.indexOf(b);
    this.elms.splice(index, 0, a);
  }
  removeChild(c: A): void {
    this.api.removeChild(c);
    const index = this.elms.indexOf(c);
    this.elms.splice(index, 1);
  }
}

type ComponentInfo<O> = {
  output: O;
  destroy: Future<boolean>;
  elms: DomApi[];
};

class ComponentList<A, O> extends Component<Behavior<O[]>, {}> {
  constructor(
    private compFn: (a: A) => Component<O, any>,
    private listB: Behavior<A[]>,
    private getKey: (a: A, index: number) => number | string
  ) {
    super();
  }
  run(
    parent: DomApi<any>,
    listDestroyed: Future<boolean>,
    t: Time
  ): Out<Behavior<O[]>, {}> {
    // The reordering code below is neither pretty nor fast. But it at
    // least avoids recreating elements and is quite simple.
    const resultB = sinkBehavior<O[]>([]);
    let keyToElm: Record<string, ComponentInfo<O>> = {};
    const parentWrap = new FixedDomPosition(parent, listDestroyed);
    this.listB.subscribe(newAs => {
      const newKeyToElm: Record<string, ComponentInfo<O>> = {};
      const newArray: O[] = [];
      // Re-add existing elements and new elements
      for (let i = 0; i < newAs.length; i++) {
        const a = newAs[i];
        const key = this.getKey(a, i);
        let info = keyToElm[key];
        if (info === undefined) {
          const destroy = sinkFuture<boolean>();
          const recorder = new DomRecorder<any>(parentWrap);
          const { output } = this.compFn(a).run(
            recorder,
            destroy.combine(listDestroyed),
            t
          );
          info = { elms: recorder.elms, output, destroy };
        } else {
          for (const elm of info.elms) {
            parentWrap.appendChild(elm);
          }
        }
        newArray.push(info.output);
        newKeyToElm[key] = info;
      }
      // Remove elements that are no longer present
      const oldKeys = Object.keys(keyToElm);
      for (const key of oldKeys) {
        if (newKeyToElm[key] === undefined) {
          keyToElm[key].destroy.resolve(true);
        }
      }
      keyToElm = newKeyToElm;
      resultB.push(newArray);
    });
    return { available: resultB, output: {} };
  }
}

export function list<A extends string | number, O>(
  componentCreator: (a: A) => Component<any, O>,
  listB: Behavior<A[]>,
  getKey?: (a: A, index: number) => number | string
): Component<Behavior<O[]>, {}>;
export function list<A, O>(
  componentCreator: (a: A) => Component<any, O>,
  listB: Behavior<A[]>,
  getKey: (a: A, index: number) => number | string
): Component<Behavior<O[]>, {}>;
export function list<A, O>(
  componentCreator: (a: A) => Component<any, O>,
  listB: Behavior<A[]>,
  getKey: (a: A, index: number) => number | string = id as any
): Component<Behavior<O[]>, {}> {
  return new ComponentList(componentCreator, listB, getKey);
}

/**
 * Takes a component type and returns the explicit output of the component.
 */
export type ComponentExplicitOutput<C> = C extends Component<any, infer A>
  ? A
  : never;

export type ChildExplicitOutput<Ch extends Child> = ComponentExplicitOutput<
  ToComponent<Ch>
>;

export type Wrapped<E, P, O> = (undefined extends P
  ? {
      // Optional props
      // Only props
      (props?: P): Component<O, {}>;
      // Only child
      <Ch extends Child>(child: Ch): Component<
        ChildExplicitOutput<Ch> & O,
        ChildExplicitOutput<Ch>
      >;
    }
  : {
      // Required props
      // Only props
      (props: P): Component<{}, O>;
    }) & {
  // Both props and child
  <Ch extends Child>(props: P, child: Ch): Component<
    ChildExplicitOutput<Ch>,
    ChildExplicitOutput<Ch> & O
  >;
};

export function wrapper<E, P, O>(
  fn: (props: P, child: Component<any, any> | undefined) => Component<any, O>
): Wrapped<E, P, O> {
  function wrappedComponent(
    newPropsOrChild: P | Child,
    childOrUndefined: Child | undefined
  ) {
    const props =
      newPropsOrChild !== undefined && !isChild(newPropsOrChild)
        ? newPropsOrChild
        : undefined;
    const child =
      childOrUndefined !== undefined
        ? toComponent(childOrUndefined)
        : isChild(newPropsOrChild)
        ? toComponent(newPropsOrChild)
        : undefined;
    return fn(props!, child);
  }
  return <any>wrappedComponent;
}
