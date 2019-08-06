import {
  Behavior,
  Future,
  isBehavior,
  Now,
  placeholder,
  runNow,
  sinkBehavior,
  sinkFuture,
  Stream
} from "@funkia/hareactive";
import { fgo, go, Monad, monad } from "@funkia/jabz";
import { FixedDomPosition } from "./native";
import {
  copyRemaps,
  id,
  Merge,
  mergeObj,
  Showable,
  isShowable,
  isGeneratorFunction
} from "./utils";
import { viewObserve } from "./hareactive-wrapper";

const supportsProxy = typeof Proxy !== "undefined";

export interface ViewApi<C = Node> {
  parent: any;
  appendChild(child: C): void;
  insertBefore(insert: C, before: C): void;
  removeChild(child: C): void;
}

export type Out<O, A> = {
  explicit: O;
  output: A;
};

/**
 * A component is a function from a parent DOM node to a now
 * computation I.e. something like `type Component<A> = (p: Node) =>
 * Now<A>`. We don't define it as a type alias because we want to
 * make it a monad in different way than Now.
 */
@monad
export abstract class Component<E, O, A> implements Monad<A> {
  static of<B>(b: B): Component<any, {}, B> {
    return new OfComponent(b);
  }
  of<B>(b: B): Component<any, {}, B> {
    return new OfComponent(b);
  }
  flatMap<B>(f: (a: A) => Component<E, O, B>): Component<E, O, B> {
    return new FlatMapComponent(this, f);
  }
  chain<B>(f: (a: A) => Component<E, O, B>): Component<E, O, B> {
    return new FlatMapComponent(this, f);
  }
  output<P>(f: (a: A) => P): Component<E, O & P, A>;
  output<B extends Record<string, keyof A>>(
    remaps: B
  ): Component<E, O & Remap<A, B>, A>;
  output(handler: any): Component<E, any, A> {
    if (typeof handler === "function") {
      return new HandleOutput((e, o) => mergeObj(e, handler(o)), this);
    } else {
      return new HandleOutput(
        (e, o) => mergeObj(e, copyRemaps(handler, o)),
        this
      );
    }
    // return new OutputComponent(remaps, this);
  }
  static multi: boolean = false;
  multi: boolean = false;
  abstract run(
    parent: ViewApi<E>,
    destroyed: Future<boolean>
  ): { explicit: O; output: A };
  // Definitions below are inserted by Jabz
  flatten: <B>() => Component<E, O, B>;
  map: <B>(f: (a: A) => B) => Component<E, O, B>;
  mapTo: <B>(b: B) => Component<E, O, B>;
  ap: <B, P>(a: Component<E, P, (a: A) => B>) => Component<E, O, B>;
  lift: (f: Function, ...ms: any[]) => Component<E, O, any>;
}

class OfComponent<A> extends Component<any, {}, A> {
  constructor(private value: A) {
    super();
  }
  run(_1: ViewApi<any>, _2: Future<boolean>): { explicit: {}; output: A } {
    return { explicit: {}, output: this.value };
  }
}

class PerformComponent<A> extends Component<any, {}, A> {
  constructor(private cb: () => A) {
    super();
  }
  run(_1: ViewApi<any>, _2: Future<boolean>): { explicit: {}; output: A } {
    return { explicit: {}, output: this.cb() };
  }
}

/**
 * Takes a callback, potentially with side-effects. The callback is invoked when
 * the component is run and the return value becomes the components output.
 */
export function performComponent<A>(callback: () => A) {
  return new PerformComponent(callback);
}

export function liftNow<A>(now: Now<A>) {
  return performComponent(() => runNow(now));
}

class HandleOutput<E, O, A, P> extends Component<E, P, A> {
  constructor(
    private readonly handler: (explicit: O, output: A) => P,
    private readonly c: Component<E, O, A>
  ) {
    super();
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<P, A> {
    const { explicit, output } = this.c.run(parent, destroyed);
    const newExplicit = this.handler(explicit, output);
    return { explicit: newExplicit, output };
  }
}

export type Remap<
  A extends Record<any, any>,
  B extends Record<any, keyof A>
> = { [K in keyof B]: A[B[K]] };

export function output<E, A, O, P>(
  f: (a: A) => P,
  c: Component<E, O, A>
): Component<E, O & P, A>;
export function output<E, A, O, B extends Record<string, keyof A>>(
  remaps: B,
  c: Component<E, O, A>
): Component<E, O & Remap<A, B>, A>;
export function output<E, A>(
  remaps: any,
  component: Component<E, any, A>
): Component<E, any, A> {
  return component.output(remaps);
}

/**
 * An empty component that adds no elements to the DOM and produces an
 * empty object as output.
 */
export const emptyComponent = Component.of({});

class FlatMapComponent<E, O, A, B> extends Component<E, O, B> {
  constructor(
    private component: Component<E, O, A>,
    private f: (a: A) => Component<E, O, B>
  ) {
    super();
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<O, B> {
    const { explicit, output: outputFirst } = this.component.run(
      parent,
      destroyed
    );
    const { explicit: _discarded, output } = this.f(outputFirst).run(
      parent,
      destroyed
    );
    return { explicit, output };
  }
}

export function isComponent(c: any): c is Component<any, any, any> {
  return c instanceof Component;
}

export interface ReactivesObject {
  [a: string]: Behavior<any> | Stream<any> | Future<any>;
}

const placeholderProxyHandler = {
  get: function(target: any, name: string): Behavior<any> | Stream<any> {
    if (!(name in target)) {
      target[name] = placeholder();
    }
    return target[name];
  }
};

class LoopComponent<E, O, A> extends Component<E, O, A> {
  constructor(private f: (a: A) => Child, private placeholderNames?: string[]) {
    super();
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<O, A> {
    let placeholderObject: any = { destroyed };
    if (supportsProxy) {
      placeholderObject = new Proxy(placeholderObject, placeholderProxyHandler);
    } else {
      if (this.placeholderNames !== undefined) {
        for (const name of this.placeholderNames) {
          placeholderObject[name] = placeholder();
        }
      }
    }
    const { explicit, output } = toComponent(this.f(placeholderObject)).run(
      parent,
      destroyed
    );
    const returned: (keyof A)[] = <any>Object.keys(output);
    for (const name of returned) {
      placeholderObject[name].replaceWith(output[name]);
    }
    return { explicit, output };
  }
}
export function loop<E, O, A extends ReactivesObject>(
  f: (a: A) => Child<O>,
  placeholderNames?: string[]
): Component<E, O, A> {
  const f2 = isGeneratorFunction(f) ? fgo<A>(f) : f;
  return new LoopComponent<E, O, A>(f2, placeholderNames);
}

class MergeComponent<
  E,
  O extends object,
  A,
  P extends object,
  B
> extends Component<E, O & P, O & P> {
  constructor(private c1: Component<E, O, A>, private c2: Component<E, P, B>) {
    super();
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<O & P, O & P> {
    const { explicit: explicit1 } = this.c1.run(parent, destroyed);
    const { explicit: explicit2 } = this.c2.run(parent, destroyed);
    const merged = Object.assign({}, explicit1, explicit2);
    return { explicit: merged, output: merged };
  }
}

/**
 * Merges two components. Their explicit output is combined.
 */
export function merge<E, O extends object, A, P extends object, B>(
  c1: Component<E, O, A>,
  c2: Component<E, P, B>
): Component<E, O & P, O & P> {
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

class ModelViewComponent<E, M extends ReactivesObject, V> extends Component<
  E,
  {},
  M
> {
  constructor(
    private args: any[],
    private model: (...as: any[]) => Now<M>,
    private view: (...as: any[]) => Child<V>,
    private placeholderNames?: string[]
  ) {
    super();
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<{}, M> {
    const { view, model, args } = this;
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
    const { explicit: viewOutput } = toComponent(
      view(placeholders, ...args)
    ).run(parent, destroyed);
    const helpfulViewOutput = addErrorHandler(
      model.name,
      view.name,
      Object.assign(viewOutput, { destroyed })
    );
    const behaviors = runNow(model(helpfulViewOutput, ...args));
    // Tie the recursive knot
    for (const name of Object.keys(behaviors)) {
      placeholders[name].replaceWith(behaviors[name]);
    }
    return { explicit: {}, output: behaviors };
  }
}

export type ModelReturn<M> = Now<M> | Iterator<any>;
export type Model<V, M> = (v: V) => ModelReturn<M>;
export type Model1<V, M, A> = (v: V, a: A) => ModelReturn<M>;
export type View<M, V> = (m: M) => Child<V>;
export type View1<M, V, A> = (m: M, a: A) => Child<V>;

export function modelView<E, M extends ReactivesObject, V>(
  model: Model<V, M>,
  view: View<M, V>,
  toViewReactiveNames?: string[]
): () => Component<E, {}, M>;
export function modelView<E, M extends ReactivesObject, V, A>(
  model: Model1<V, M, A>,
  view: View1<M, V, A>,
  toViewReactiveNames?: string[]
): (a: A) => Component<E, {}, M>;
export function modelView<E, M extends ReactivesObject, V>(
  model: any,
  view: any,
  toViewReactiveNames?: string[]
): (...args: any[]) => Component<E, {}, M> {
  const m: any = isGeneratorFunction(model) ? fgo(model) : model;
  return (...args: any[]) =>
    new ModelViewComponent<E, M, V>(args, m, view, toViewReactiveNames);
}

export type ChildElement<E, O = any> =
  | Component<E, O, any>
  | Behavior<Component<E, any, any>>
  | Showable
  | Behavior<Showable>
  | ChildList;

// Child element short alias
type CE<E = any, O = any> = ChildElement<E, O>;

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
 * Takes a component type and returns the explicit output of the component.
 */
export type ComponentExplicitOutput<C> = C extends Component<any, infer O, any>
  ? O
  : never;

/**
 * Takes a component type and returns the output of the component.
 */
export type ComponentOutput<C> = C extends Component<any, any, infer A>
  ? A
  : never;

export type ComponentElementType<C> = C extends Component<infer E, any, any>
  ? E
  : never;

export type ChildExplicitOutput<Ch extends Child> = ComponentExplicitOutput<
  ToComponent<Ch>
>;

// Merge component
export type MC<C1 extends CE, C2 extends CE> = Component<
  any,
  ComponentExplicitOutput<TC<C1>> & ComponentExplicitOutput<TC<C2>>,
  Merge<ComponentExplicitOutput<TC<C1>> & ComponentExplicitOutput<TC<C2>>>
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
  Component<any, any, any>;

export type TC<A> = A extends Component<any, infer O, any>
  ? Component<any, O, O>
  : A extends Showable
  ? Component<any, {}, {}>
  : A extends Behavior<Showable>
  ? Component<any, {}, {}>
  : Component<any, any, any>;

export type ToComponent<A> = A extends Child[] ? ArrayToComponent<A> : TC<A>;

export function isChild(a: any): a is Child {
  return (
    isComponent(a) ||
    isGeneratorFunction(a) ||
    isBehavior(a) ||
    isShowable(a) ||
    Array.isArray(a)
  );
}

class ListComponent<E> extends Component<E, any, any> {
  components: Component<E, any, any>[];
  constructor(children: Child[]) {
    super();
    this.components = [];
    for (const child of children) {
      const component = toComponent(child);
      this.components.push(component);
    }
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<any, any> {
    const output: Record<string, any> = {};
    for (let i = 0; i < this.components.length; ++i) {
      const component = this.components[i];
      const { explicit } = component.run(parent, destroyed);
      Object.assign(output, explicit);
    }
    return { explicit: output, output };
  }
}

class TextComponent extends Component<Showable, {}, {}> {
  constructor(private text: Showable) {
    super();
  }
  run(api: ViewApi<Showable>, destroyed: Future<boolean>) {
    api.appendChild(this.text);
    return {
      explicit: {},
      output: {}
    };
  }
}

export function text(show: Showable) {
  return new TextComponent(show);
}

export function toComponent<A extends Child>(child: A): ToComponent<A> {
  if (isComponent(child)) {
    return child as any;
  } else if (isShowable(child)) {
    return text(child) as any;
  } else if (isBehavior(child)) {
    return dynamic(child).mapTo({}) as any;
  } else if (isGeneratorFunction(child)) {
    return go(child);
  } else if (Array.isArray(child)) {
    return new ListComponent(child) as any;
  } else {
    throw new Error("Child could not be converted to component: " + child);
  }
}

class DynamicComponent<E, O> extends Component<E, {}, Behavior<O>> {
  constructor(private behavior: Behavior<Child<O>>) {
    super();
  }
  run(
    parent: ViewApi<E>,
    dynamicDestroyed: Future<boolean>
  ): Out<{}, Behavior<O>> {
    let destroyPrevious: Future<boolean>;
    const parentWrap = new FixedDomPosition(parent, dynamicDestroyed);

    const output = this.behavior.map(child => {
      if (destroyPrevious !== undefined) {
        destroyPrevious.resolve(true);
      }
      destroyPrevious = sinkFuture<boolean>();
      const { explicit } = toComponent(child).run(
        parentWrap,
        destroyPrevious.combine(dynamicDestroyed)
      );
      return explicit;
    });
    // To activate behavior
    viewObserve(id, output);

    return { explicit: {}, output };
  }
}

export function dynamic<E, O>(
  behavior: Behavior<Component<E, O, any>>
): Component<E, {}, Behavior<O>>;
export function dynamic(behavior: Behavior<Child>): Component<any, {}, {}>;
export function dynamic<E, O>(
  behavior: Behavior<Child<O>>
): Component<any, {}, Behavior<O>> {
  return new DynamicComponent<E, O>(behavior);
}

type ComponentStuff<E, A> = {
  out: A;
  destroy: Future<boolean>;
  elms: E[];
};

class DomRecorder<A> implements ViewApi<A> {
  elms: A[] = [];
  parent: any;
  constructor(private api: ViewApi<A>) {
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

class ComponentList<E, A, O> extends Component<E, {}, Behavior<O[]>> {
  constructor(
    private compFn: (a: A) => Component<E, O, any>,
    private listB: Behavior<A[]>,
    private getKey: (a: A, index: number) => number | string
  ) {
    super();
  }
  run(
    parent: ViewApi<E>,
    listDestroyed: Future<boolean>
  ): Out<{}, Behavior<O[]>> {
    // The reordering code below is neither pretty nor fast. But it at
    // least avoids recreating elements and is quite simple.
    const resultB = sinkBehavior<O[]>([]);
    let keyToElm: Record<string, ComponentStuff<E, O>> = {};
    const parentWrap = new FixedDomPosition(parent, listDestroyed);
    this.listB.subscribe(newAs => {
      const newKeyToElm: Record<string, ComponentStuff<E, O>> = {};
      const newArray: O[] = [];
      // Re-add existing elements and new elements
      for (let i = 0; i < newAs.length; i++) {
        const a = newAs[i];
        const key = this.getKey(a, i);
        let stuff = keyToElm[key];
        if (stuff === undefined) {
          const destroy = sinkFuture<boolean>();
          const recorder = new DomRecorder(parentWrap);
          const out = this.compFn(a).run(
            recorder,
            destroy.combine(listDestroyed)
          );
          stuff = { elms: recorder.elms, out: out.explicit, destroy };
        } else {
          for (const elm of stuff.elms) {
            parentWrap.appendChild(elm);
          }
        }
        newArray.push(stuff.out);
        newKeyToElm[key] = stuff;
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
    return { explicit: {}, output: resultB };
  }
}

export function list<E, A extends string | number, O>(
  componentCreator: (a: A) => Component<E, O, any>,
  listB: Behavior<A[]>,
  getKey?: (a: A, index: number) => number | string
): Component<E, {}, Behavior<O[]>>;
export function list<E, A, O>(
  componentCreator: (a: A) => Component<E, O, any>,
  listB: Behavior<A[]>,
  getKey: (a: A, index: number) => number | string
): Component<E, {}, Behavior<O[]>>;
export function list<E, A, O>(
  componentCreator: (a: A) => Component<E, O, any>,
  listB: Behavior<A[]>,
  getKey: (a: A, index: number) => number | string = id as any
): Component<E, {}, Behavior<O[]>> {
  return new ComponentList(componentCreator, listB, getKey);
}

export type Wrapped<E, P, O> = (undefined extends P
  ? {
      // Optional props
      // Only props
      (props?: P): Component<E, {}, O>;
      // Only child
      <Ch extends Child>(child: Ch): Component<
        E,
        ChildExplicitOutput<Ch>,
        ChildExplicitOutput<Ch> & O
      >;
    }
  : {
      // Required props
      // Only props
      (props: P): Component<E, {}, O>;
    }) & {
  // Both props and child
  <Ch extends Child>(props: P, child: Ch): Component<
    E,
    ChildExplicitOutput<Ch>,
    ChildExplicitOutput<Ch> & O
  >;
};

export function wrapper<E, P, O>(
  fn: (
    props: P,
    child: Component<E, any, any> | undefined
  ) => Component<E, any, O>
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
