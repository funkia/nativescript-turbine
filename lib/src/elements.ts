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
import { Label } from "ui/label";

import { uiViewElement } from "./ui-builder";
import { Component } from "@funkia/turbine/dist/cmjs/component";
import { Future } from "@funkia/hareactive";

export const absoluteLayout = uiViewElement(AbsoluteLayout);
export const dockLayout = uiViewElement(DockLayout);
export const flexboxLayout = uiViewElement(FlexboxLayout);
export const gridLayout = uiViewElement(GridLayout);
export const stackLayout = uiViewElement(StackLayout);
export const wrapLayout = uiViewElement(WrapLayout);

export const label = uiViewElement(Label);

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
  constructor(private content: Component<any, any>) {
    super();
  }
  run(frame: any /* Frame */, destroyed: Future<boolean>) {
    const p = new Page();
    this.content.run(p as any, destroyed);
    frame.navigate(() => p);
    return { explicit: {}, output: {} };
  }
}

export function page(content: Component<any, any>) {
  return new PageComponent(content);
}
