import { Page } from "tns-core-modules/ui/page";
import { Frame } from "tns-core-modules/ui/frame";
import { Button } from "tns-core-modules/ui/button";
import { AbsoluteLayout } from "tns-core-modules/ui/layouts/absolute-layout";
import { DockLayout } from "tns-core-modules/ui/layouts/dock-layout";
import { FlexboxLayout } from "tns-core-modules/ui/layouts/flexbox-layout";
import { GridLayout } from "tns-core-modules/ui/layouts/grid-layout";
import { StackLayout } from "tns-core-modules/ui/layouts/stack-layout";
import { WrapLayout } from "tns-core-modules/ui/layouts/wrap-layout";
import { TextField } from "tns-core-modules/ui/text-field";

import { uiViewElement } from "./ui-builder";
import { Component } from "./component";

export const absoluteLayout = uiViewElement(AbsoluteLayout);
export const dockLayout = uiViewElement(DockLayout);
export const flexboxLayout = uiViewElement(FlexboxLayout);
export const gridLayout = uiViewElement(GridLayout);
export const stackLayout = uiViewElement(StackLayout);
export const wrapLayout = uiViewElement(WrapLayout);

export const textField = uiViewElement(TextField, {
  behaviors: {
    textValue: {
      name: "text",
      initial: ""
    }
  }
});

export const button = uiViewElement(Button, {
  streams: {
    tap: {
      name: "tap"
    }
  }
});

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

