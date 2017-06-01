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

interface UIConstuctor<A> {
  new (): A
}

type Parent = Page | LayoutBase;
type Child<A = {}> = Component<A, Parent> | Showable;

type Properties = {
  style?: Partial<Style>
}

function isShowable(obj: any): boolean {
  return obj instanceof String || obj instanceof Number;
}

class UIViewElement <B, A extends View> extends Component<B, Parent> {
  constructor(
    private viewC: UIConstuctor<A>, 
    private props: Properties,
    private child: Child<any>
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
    if (view instanceof TextBase) {
      view.text = this.child.toString();
    } else if ((view instanceof Page || view instanceof LayoutBase) && isComponent(this.child)) {
      (<any>this.child).run(view);
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
  return (props: Properties, child: Child<A>) => new UIViewElement(viewC, props, child);
}
