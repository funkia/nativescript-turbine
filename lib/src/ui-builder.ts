import { View } from "tns-core-modules/ui/core/view";
import { Page } from "tns-core-modules/ui/page";
import { Style } from "tns-core-modules/ui/styling/style";
import { LayoutBase } from "tns-core-modules/ui/layouts/layout-base";
import { TextBase } from "tns-core-modules/ui/text-base";

import { isBehavior, Behavior, Future, toggle } from "@funkia/hareactive";
import {
  Component,
  isComponent,
  toComponent,
  Showable,
  DomApi,
  Out
} from "@funkia/turbine/dist/cmjs/component";
import {
  streamFromObservable,
  behaviorFromObservable,
  viewObserve
} from "./hareactive-wrapper";

export type ClassNames = Behavior<string> | string;

export type ClassToggles = {
  [name: string]: boolean | Behavior<boolean>;
};

export type ClassDescription =
  | ClassNames
  | ClassToggles
  | ClassDescriptionArray;

export interface ClassDescriptionArray extends Array<ClassDescription> {}

interface UIConstructor<A> {
  new (): A;
}

type Parent = Page | LayoutBase;
interface ChildList extends Array<Child> {}
export type Child<A = {}> =
  | ChildList
  | Component<A, Parent>
  | Showable
  | Behavior<Showable>;

type StreamDescription<B> = {
  name: string;
  extractor?: (a: any) => B;
};

type BehaviorDescription<B> = {
  name: string;
  initial: B;
  extractor?: (a: any) => B;
};

type Properties = {
  style?: Partial<Style | Record<string, string>>;
  streams?: Record<string, StreamDescription<any>>;
  behaviors?: Record<string, BehaviorDescription<any>>;
  class?: ClassDescription;
  props?: Record<string, any>;
};

function isShowable(obj: any): obj is Showable {
  return typeof obj === "string" || typeof obj === "number";
}

function isChild(a: any): a is Child {
  return isComponent(a) || isShowable(a) || Array.isArray(a) || isBehavior(a);
}

function isParent(a: any): a is Parent {
  return a instanceof Page || a instanceof LayoutBase;
}

function id<A>(a: A): A {
  return a;
}

function handleSideEffect<A>(
  input: Behavior<A> | A,
  sideEffekt: (a: A) => void
) {
  if (isBehavior(input)) {
    viewObserve(sideEffekt, input);
  } else {
    sideEffekt(input);
  }
}

function handleClasses(view: View, desc: ClassDescription) {
  if (Array.isArray(desc)) {
    for (const d of desc) {
      handleClasses(view, d);
    }
  } else if (typeof desc === "string") {
    toggleClass(view, desc, true);
  } else if (isBehavior(desc)) {
    let prev: string;
    viewObserve(next => {
      toggleClass(view, prev, false);
      toggleClass(view, next, true);
      prev = next;
    }, desc);
  } else {
    const classes = Object.keys(desc);
    for (const className of classes) {
      const input = classes[className];
      handleSideEffect(input, toggleClass.bind(undefined, view, className));
    }
  }
}

function toggleClass(view: View, classStr: string, shouldSet: boolean) {
  const classes = classStr.split(" ");
  if (shouldSet) {
    for (const c of classes) {
      view.cssClasses.add(c);
    }
  } else {
    for (const c of classes) {
      view.cssClasses.delete(c);
    }
  }
}

class UIViewElement<B, A extends View, P> extends Component<P, Parent & P> {
  constructor(
    private viewC: UIConstructor<A>,
    private props: Properties,
    private child?: Component<P, any>
  ) {
    super();
  }
  run(parent: DomApi, destroyed: Future<boolean>): Out<P, Parent & P> {
    const view = new this.viewC();

    if ("style" in this.props) {
      for (const key of Object.keys(this.props.style)) {
        const value = this.props.style[key];
        handleSideEffect(value, v => {
          view.style.set(key, v);
        });
      }
    }

    if ("props" in this.props) {
      for (const key of Object.keys(this.props.props)) {
        const value = this.props.props[key];
        handleSideEffect(value, v => {
          view.set(key, v);
        });
      }
    }

    if ("class" in this.props) {
      handleClasses(view, this.props.class);
    }

    // output
    let output: any = {};
    let explicit: any = {};
    if ("streams" in this.props) {
      Object.keys(this.props.streams).reduce((out, key) => {
        const { name, extractor = id } = this.props.streams[key];
        out[key] = streamFromObservable(view, name, extractor);
        return out;
      }, output);
    }

    if ("behaviors" in this.props) {
      Object.keys(this.props.behaviors).reduce((out, key) => {
        const { name, extractor = id, initial } = this.props.behaviors[key];
        out[key] = behaviorFromObservable(view, name, initial, extractor);
        return out;
      }, output);
    }

    // add ourself
    // parent.appendChild(view);
    if (parent instanceof Page) {
      parent.content = view;
    } else {
      (parent as any).addChild(view);
    }

    // add child
    if (this.child !== undefined) {
      if (view instanceof TextBase) {
        if (isShowable(this.child)) {
          view.set("text", this.child.toString());
        } else if (isBehavior(this.child)) {
          viewObserve(a => view.set("text", a.toString()), this.child);
        } else {
          throw "Child should be a Text, Number or a Behavior of them";
        }
      } else if (isParent(view) && isChild(this.child)) {
        const childResult = toComponent(<any>this.child).run(
          view as any,
          destroyed
        );
        Object.assign(output, childResult.explicit);
        Object.assign(explicit, childResult.explicit);
      } else {
        throw "Unsupported child";
      }
    }

    // TODO handle destroyed

    return { output, explicit };
  }
}

export function uiViewElement<A extends View>(
  viewC: UIConstructor<A>,
  defaultProps: Properties = {}
) {
  function createUI();
  function createUI(child: Child<A>);
  function createUI(propsOrChild: Properties);
  function createUI(props: Properties, child: Child<A>);
  function createUI(
    propsOrChild?: Properties | Child<A>,
    child?: Child<A>
  ): Component<any, any> {
    if (child === undefined && isChild(propsOrChild)) {
      return new UIViewElement(viewC, defaultProps, propsOrChild as any);
    } else {
      return new UIViewElement(
        viewC,
        mergeProps(defaultProps, <Properties>propsOrChild),
        child as any
      );
    }
  }
  return createUI;
}

function mergeProps(a: Properties, b: Properties): Properties {
  // TODO: more intelligent
  return Object.assign({}, a, b);
}
