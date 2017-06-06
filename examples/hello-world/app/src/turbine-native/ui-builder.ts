import { Showable } from '@funkia/turbine';
import { View } from "ui/core/view";
import { Page } from "ui/page";
import { Style } from "ui/styling/style";
import { LayoutBase } from "ui/layouts/layout-base";
import { TextBase } from "ui/text-base";
import { Frame } from "ui/frame";
import { Observable, EventData } from "data/observable";

import { Component, isComponent } from './component';
import { streamFromObservable } from "./hareactive-wrapper";
import { sequence } from "@funkia/jabz";

interface UIConstuctor<A> {
  new (): A
}

type Parent = Page | LayoutBase;
interface ChildList extends Array<Child> {}
type Child<A = {}> = ChildList | Component<A, Parent> | Showable;

type Properties = {
  style?: Partial<Style>
}

function isShowable(obj: any): obj is Showable {
  return typeof obj === "string" || typeof obj === "number"; 
}

function isChild(a: any): a is Child {
  return isComponent(a) || isShowable(a) || Array.isArray(a);
}

function isParent(a: any): a is Parent {
  return a instanceof Page || a instanceof LayoutBase;
}

function toComponent(c: any): Component<any, any> {
  if (isComponent(c)) return c;
  if (Array.isArray(c)) return sequence(Component, c.map(toComponent));
}

class UIViewElement <B, A extends View> extends Component<B, Parent> {
  constructor(
    private viewC: UIConstuctor<A>, 
    private props: Properties,
    private child?: Child<any>
  ) {
    super();
  }
  run(parent: Parent): B {
    const view = new this.viewC();
    
    if ("style" in this.props) {
      Object.keys(this.props.style).forEach(key => {
        view.style.set(key, this.props.style[key]);
      })
    }

    // add child
    if (this.child !== undefined) {
      if (view instanceof TextBase) {
        if (isShowable(this.child)) {
          view.text = this.child.toString();
        } else {
          throw "Child should be a Text or Number";
        }
      } else if (isParent(view) && isChild(this.child)) {
        toComponent(<any>this.child).run(view);
      } else {
        throw "Unsupported child";
      }
    }

    // add ourself
    if (parent instanceof Page) {
      parent.content = view;
    } else {
      parent.addChild(view);
    }

    // output
    let output: any = {};
    if (view instanceof Observable) {
      output.tap = streamFromObservable(view, "tap");
    }
    
    return output;
  }
}



export function uiViewElement<A extends View>(viewC: UIConstuctor<A>) {
  function createUI(propsOrChild?: Properties, child?: Child<A>) {
    if (child === undefined && isChild(propsOrChild)) {
      return new UIViewElement(viewC, {}, propsOrChild);
    } else {
      return new UIViewElement(viewC, propsOrChild, child);
    }
  }
  return createUI;
}