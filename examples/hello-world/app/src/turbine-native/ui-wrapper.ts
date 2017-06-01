import { Showable } from '@funkia/turbine/dist/defs/component';
import { View } from "ui/core/view";
import { Page } from "ui/page";
import { Style } from "ui/styling/style";
import { LayoutBase } from "ui/layouts/layout-base";
import { TextBase } from "ui/text-base";
import { Frame } from "ui/frame";

import { Component, isComponent } from './component';


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

class UIViewElement <B, A extends View> extends Component<B, any> {
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
    
    if (view instanceof TextBase && isShowable(this.child)) {
      view.text = this.child.toString();
    } else if ((view instanceof Page || view instanceof LayoutBase) && isComponent(this.child)) {
      (<any>this.child).run(view);
    } 

    if (parent instanceof Page) {
      parent.content = view;    
    } else {
      parent.addChild(view);
    }

    return;
  }
}

export function uiViewElement<A extends View>(viewC: UIConstuctor<A>) {
  return (props: Properties, child: Child<A>) => new UIViewElement(viewC, props, child);
}



