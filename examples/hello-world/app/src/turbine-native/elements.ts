import { Page } from "ui/page";
import { Frame } from "ui/frame";
import { Button } from "ui/button";
import { AbsoluteLayout } from "ui/layouts/absolute-layout";
import { DockLayout } from "ui/layouts/dock-layout";
import { FlexboxLayout } from "ui/layouts/flexbox-layout";
import { GridLayout } from "ui/layouts/grid-layout";
import { StackLayout } from "ui/layouts/stack-layout";
import { WrapLayout } from "ui/layouts/wrap-layout";
import { TextField } from "ui/text-field";

import { uiViewElement } from "./ui-builder";
import { Component } from "./component";

export const absoluteLayout = uiViewElement(AbsoluteLayout);
export const dockLayout = uiViewElement(DockLayout);
export const flexboxLayout = uiViewElement(FlexboxLayout);
export const gridLayout = uiViewElement(GridLayout);
export const stackLayout = uiViewElement(StackLayout);
export const wrapLayout = uiViewElement(WrapLayout);

export const textField = uiViewElement(TextField);

export const button = uiViewElement(Button);

export class PageComponent extends Component<{}, any> {
  constructor(private content: Component<any, Page>) {
    super();
  }
  run(frame: Frame) {
    const p = new Page();
    this.content.run(p);
    frame.navigate(() => p);
    return {};
  }
}

export function page(content: Component<any, Page>) {
  return new PageComponent(content);
};

