import { Page } from "tns-core-modules/ui/page";
import { ActionBar, NavigationButton } from "tns-core-modules/ui/action-bar";
import { Button } from "tns-core-modules/ui/button";
import { AbsoluteLayout } from "tns-core-modules/ui/layouts/absolute-layout";
import { DockLayout } from "tns-core-modules/ui/layouts/dock-layout";
import { FlexboxLayout } from "tns-core-modules/ui/layouts/flexbox-layout";
import { GridLayout } from "tns-core-modules/ui/layouts/grid-layout";
import { StackLayout } from "tns-core-modules/ui/layouts/stack-layout";
import { WrapLayout } from "tns-core-modules/ui/layouts/wrap-layout";
import { ScrollView } from "tns-core-modules/ui/scroll-view";

import { TextField } from "tns-core-modules/ui/text-field";
import { TextView } from "tns-core-modules/ui/text-view";
import { Label } from "tns-core-modules/ui/label";
import { DatePicker } from "tns-core-modules/ui/date-picker";
import { ListPicker } from "tns-core-modules/ui/list-picker";

import { uiViewElement } from "./ui-builder";
import { Frame } from "tns-core-modules/ui/frame";

export { text } from "./component";
export const absoluteLayout = uiViewElement(AbsoluteLayout);
export const dockLayout = uiViewElement(DockLayout);
export const flexboxLayout = uiViewElement(FlexboxLayout);
export const gridLayout = uiViewElement(GridLayout);
export const stackLayout = uiViewElement(StackLayout);
export const wrapLayout = uiViewElement(WrapLayout);
export const scrollView = uiViewElement(ScrollView);

export const label = uiViewElement(Label);

export const datePicker = uiViewElement(DatePicker, {
  behaviors: {
    date: {
      event: "date",
      initial: () => ""
    }
  }
});
export const listPicker = uiViewElement(ListPicker, {
  behaviors: {
    selectedIndex: {
      event: "selectedIndexChange",
      initial: view => view.selectedIndex
    }
  }
});

export const textField = uiViewElement(TextField, {
  behaviors: {
    text: {
      event: TextField.textChangeEvent,
      initial: view => view.text
    }
  }
});
export const textView = uiViewElement(TextView, {
  behaviors: {
    text: {
      event: TextField.textChangeEvent,
      initial: view => view.text
    }
  }
});

export const button = uiViewElement(Button, {
  streams: {
    tap: {
      event: "tap"
    }
  }
});
export const actionBar = uiViewElement(ActionBar);
export const page = uiViewElement(Page);
export const frame = uiViewElement(Frame);

// export class FrameComponent extends Component<{}, any> {
//   constructor(private pages: Behavior<PageComponent>) {
//     super();
//   }
//   run(parent: any /* Frame */, destroyed: Future<boolean>) {
//     const f = new Frame();
//     this.pages.subscribe(page => page.run(f, destroyed.mapTo(false)));
//     if (parent instanceof Page) {
//       parent.content = f;
//     } else {
//       (parent as any).addChild(f);
//     }
//     return { explicit: {}, output: {} };
//   }
// }

// export function frame(pages: Behavior<PageComponent>) {
//   return new FrameComponent(pages);
// }
