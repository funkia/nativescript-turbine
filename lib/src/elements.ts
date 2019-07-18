import { Page } from "tns-core-modules/ui/page";
import { ActionBar } from "tns-core-modules/ui/action-bar";
import { Button } from "tns-core-modules/ui/button";
import { AbsoluteLayout } from "tns-core-modules/ui/layouts/absolute-layout";
import { DockLayout } from "tns-core-modules/ui/layouts/dock-layout";
import { FlexboxLayout } from "tns-core-modules/ui/layouts/flexbox-layout";
import { GridLayout } from "tns-core-modules/ui/layouts/grid-layout";
import { StackLayout } from "tns-core-modules/ui/layouts/stack-layout";
import { WrapLayout } from "tns-core-modules/ui/layouts/wrap-layout";
import { TextField } from "tns-core-modules/ui/text-field";
import { Label } from "tns-core-modules/ui/label";
import { DatePicker } from "tns-core-modules/ui/date-picker";
import { ListPicker } from "tns-core-modules/ui/list-picker";

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
export const datePicker = uiViewElement(DatePicker, {
  behaviors: {
    date: {
      name: "date",
      initial: ""
    }
  }
});
export const listPicker = uiViewElement(ListPicker);
export const actionBar = uiViewElement(ActionBar);

export const textField = uiViewElement(TextField, {
  behaviors: {
    text: {
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
