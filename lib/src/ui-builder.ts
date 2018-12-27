import { View } from "ui/core/view";
import { Page } from "ui/page";
import { Style } from "ui/styling/style";
import { LayoutBase } from "ui/layouts/layout-base";
import { TextBase } from "ui/text-base";
import { Frame } from "ui/frame";

import { isBehavior, Behavior, Future } from "@funkia/hareactive";
import {
  Component,
  isComponent,
  toComponent,
  Showable,
  DomApi
} from "@funkia/turbine";
import {
  streamFromObservable,
  behaviorFromObservable,
  viewObserve
} from "./hareactive-wrapper";
import { Out } from "@funkia/turbine";

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
      Object.keys(this.props.style).forEach(key => {
        view.style.set(key, this.props.style[key]);
      });
    }

    if ("props" in this.props) {
      Object.keys(this.props.props).forEach(key => {
        view.set(key, this.props[key]);
      });
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
