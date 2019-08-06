import { View, ContainerView } from "tns-core-modules/ui/core/view";
import { ContentView } from "tns-core-modules/ui/content-view";
import { Page } from "tns-core-modules/ui/page";
import { ActionBar } from "tns-core-modules/ui/action-bar";
import { Frame } from "tns-core-modules/ui/frame";
import { Style } from "tns-core-modules/ui/styling/style";
import { TextBase } from "tns-core-modules/ui/text-base";
import { LayoutBase } from "tns-core-modules/ui/layouts/layout-base";
import { EventData } from "tns-core-modules/data/observable";

import { isBehavior, Future } from "@funkia/hareactive";
import { Component, isComponent, ViewApi, Out, wrapper } from "./component";
import {
  streamFromObservable,
  behaviorFromObservable,
  viewObserve
} from "./hareactive-wrapper";
import { Showable, isShowable, Changeable, ConstructorOf } from "./utils";

export type Parent = ContentView | ContainerView;

interface ChildList extends Array<Child> {}

export type Child<E = any, A = {}> =
  | ChildList
  | Changeable<Component<E, A, any>>
  | Changeable<Showable>;

export function isChild(a: any): a is Child {
  return isComponent(a) || isShowable(a) || Array.isArray(a) || isBehavior(a);
}

export function isParent(a: any): a is Parent {
  return (
    a instanceof TextBase ||
    a instanceof ContentView ||
    a instanceof ContainerView
  );
}

function id<A>(a: A): A {
  return a;
}

type ClassNames = Changeable<string>;

type ClassToggles = {
  [name: string]: Changeable<boolean>;
};

export type ClassDescription =
  | ClassNames
  | ClassToggles
  | ClassDescriptionArray;

export interface ClassDescriptionArray extends Array<ClassDescription> {}

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

function handleSideEffect<A>(input: Changeable<A>, sideEffekt: (a: A) => void) {
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

export class NativeViewApi<A extends View> implements ViewApi<A> {
  constructor(public parent: Parent) {}
  appendChild(child: A) {
    if (child instanceof ActionBar && this.parent instanceof Page) {
      this.parent.actionBar = child;
    } else if (this.parent instanceof TextBase && isShowable(child)) {
      // this.parent.text = child.toString();
      this.parent.set("text", child.toString());
    } else if (this.parent instanceof ContentView) {
      this.parent.content = child;
    } else if (this.parent instanceof Frame) {
      this.parent.navigate({
        create() {
          return child;
        }
      });
    } else if (this.parent instanceof LayoutBase) {
      this.parent.addChild(child);
    } else {
      throw new Error("Component could not mount to parent");
    }
  }
  insertBefore(insert: A, before: A) {
    if (this.parent instanceof LayoutBase) {
      const i = this.parent.getChildIndex(before);
      this.parent.insertChild(insert, i);
    } else {
      this.appendChild(insert);
    }
  }
  removeChild(child: A) {
    if (this.parent instanceof LayoutBase) {
      this.parent.removeChild(child);
    } else if (this.parent instanceof ContentView) {
      this.parent.content = null;
    } else if (this.parent instanceof Frame) {
      throw new Error("Not implemented yet");
    }
  }
}

class UIViewElement<E extends View> extends Component<E, any, any> {
  constructor(
    private viewC: ConstructorOf<E>,
    private props: AttrProperties<E>,
    private child?: Component<E, any, any>
  ) {
    super();
  }
  run(parent: ViewApi<E>, destroyed: Future<boolean>): Out<any, any> {
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
    parent.appendChild(view);

    // run child
    if (this.child !== undefined) {
      if (!isParent(view)) {
        throw new Error("Component does not support children");
      }
      const childResult = this.child.run(
        new NativeViewApi(view),
        destroyed.mapTo(false)
      );
      Object.assign(output, childResult.explicit);
      Object.assign(explicit, childResult.explicit);
    }

    // TODO handle destroyed
    destroyed.subscribe(isTopLevel => {
      if (isTopLevel) {
        parent.removeChild(view);
      }
    });

    return { output, explicit };
  }
}

export function uiViewElement<A extends View>(
  viewC: ConstructorOf<A>,
  defaultProps: AttrProperties<A> = {}
) {
  return wrapper(
    (props: AttrProperties<A>, child: Child<A>) =>
      new UIViewElement(viewC, mergeProps(defaultProps, props), <any>child)
  );
}

function mergeProps<A extends View>(
  a: AttrProperties<A>,
  b: AttrProperties<A>
): AttrProperties<A> {
  // TODO: more intelligent
  return Object.assign({}, a, b);
}
