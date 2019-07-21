import { View } from "tns-core-modules/ui/core/view";
import { ContentView } from "tns-core-modules/ui/content-view";
import { Page } from "tns-core-modules/ui/page";
import { ActionBar } from "tns-core-modules/ui/action-bar";
import { Frame } from "tns-core-modules/ui/frame";
import { Style } from "tns-core-modules/ui/styling/style";
import { LayoutBase } from "tns-core-modules/ui/layouts/layout-base";
import { TextBase } from "tns-core-modules/ui/text-base";
import { EventData } from "tns-core-modules/data/observable";

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

type Changeable<A> = A | Behavior<A>;

export type ClassNames = Changeable<string>;

export type ClassToggles = {
  [name: string]: Changeable<boolean>;
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
  | Changeable<Component<A, any>>
  | Changeable<Showable>;

type StreamDescription<B> = {
  event: string;
  extractor?: (a: EventData) => B;
};

type BehaviorDescription<A extends View, B> = {
  event: string;
  initial: (view: A) => B;
  extractor?: (a: EventData) => B;
};

type Attributes<A extends View> = Partial<{ [K in keyof A]: Changeable<A[K]> }>;

type Properties<A extends View> = {
  style?: Partial<Style>;
  streams?: Record<string, StreamDescription<any>>;
  behaviors?: Record<string, BehaviorDescription<A, any>>;
  class?: ClassDescription;
  attrs?: Attributes<A>;
};

type AttrProperties<A extends View> = Attributes<A> & Properties<A>;

const propKeywords = new Set([
  "style",
  "streams",
  "behaviors",
  "class",
  "attrs"
]);

function isShowable(obj: any): obj is Showable {
  return typeof obj === "string" || typeof obj === "number";
}

function isChild(a: any): a is Child {
  return isComponent(a) || isShowable(a) || Array.isArray(a) || isBehavior(a);
}

function isParent(a: any): a is Parent {
  return a instanceof ContentView || a instanceof LayoutBase;
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
    private props: AttrProperties<A>,
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

    const attributes = Object.assign(
      {},
      this.props,
      "attrs" in this.props ? this.props.attrs : {}
    );

    for (const key of Object.keys(attributes)) {
      if (propKeywords.has(key)) {
        continue;
      }
      const value = attributes[key];
      handleSideEffect(value, v => {
        view.set(key, v);
      });
    }

    if ("class" in this.props) {
      handleClasses(view, this.props.class);
    }

    // output
    let output: any = {};
    let explicit: any = {};
    if ("streams" in this.props) {
      Object.keys(this.props.streams).reduce((out, key) => {
        const { event, extractor = id } = this.props.streams[key];
        out[key] = streamFromObservable(view, event, extractor);
        return out;
      }, output);
    }

    if ("behaviors" in this.props) {
      Object.keys(this.props.behaviors).reduce((out, key) => {
        const { event, extractor = id, initial } = this.props.behaviors[key];
        out[key] = behaviorFromObservable(
          view,
          event,
          initial(view),
          extractor
        ).at();
        return out;
      }, output);
    }

    // add ourself
    // parent.appendChild(view);
    if (view instanceof ActionBar && parent instanceof Page) {
      parent.actionBar = view;
    } else if (parent instanceof ContentView) {
      parent.content = view;
    } else if (parent instanceof Frame) {
      parent.navigate({
        create() {
          return view;
        }
      });
    } else {
      (parent as any).addChild(view);
    }

    // run child
    if (this.child !== undefined) {
      if (view instanceof TextBase) {
        if (isShowable(this.child)) {
          view.set("text", this.child.toString());
        } else if (isBehavior(this.child)) {
          viewObserve(a => view.set("text", a.toString()), this.child);
        } else {
          throw new Error(
            "Child should be a string, Number or a Behavior of them"
          );
        }
      } else if (isParent(view) && isChild(this.child)) {
        const childResult = toComponent(<any>this.child).run(view, destroyed);
        Object.assign(output, childResult.explicit);
        Object.assign(explicit, childResult.explicit);
      } else {
        throw new Error("Unsupported child");
      }
    }

    // TODO handle destroyed

    return { output, explicit };
  }
}

export function uiViewElement<A extends View>(
  viewC: UIConstructor<A>,
  defaultProps: AttrProperties<A> = {}
) {
  function createUI();
  function createUI(child: Child<A>);
  function createUI(propsOrChild: AttrProperties<A>);
  function createUI(props: AttrProperties<A>, child: Child<A>);
  function createUI(
    propsOrChild?: AttrProperties<A> | Child<A>,
    child?: Child<A>
  ): Component<any, any> {
    if (child === undefined && isChild(propsOrChild)) {
      return new UIViewElement(viewC, defaultProps, propsOrChild as any);
    } else {
      return new UIViewElement(
        viewC,
        mergeProps(defaultProps, <AttrProperties<A>>propsOrChild),
        child as any
      );
    }
  }
  return createUI;
}

function mergeProps<A extends View>(
  a: AttrProperties<A>,
  b: AttrProperties<A>
): AttrProperties<A> {
  // TODO: more intelligent
  return Object.assign({}, a, b);
}
