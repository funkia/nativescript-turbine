import { uiViewElement } from "./ui-wrapper";
import { Page } from "ui/page";
import { Button } from "ui/button";
import { AbsoluteLayout } from "ui/layouts/absolute-layout";
import { Frame } from "ui/frame";
import { Component } from "./component";
import { start } from 'application';

export const button = uiViewElement(Button);
export const absoluteLayout = uiViewElement(AbsoluteLayout);

class PageComp extends Component<{}, any> {
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
  return new PageComp(content);
};

export function runComponent<A>(c: PageComp) {
  let pageFn;
  const fakeframe = <Frame>{
    navigate: function(fn: () => Page) {
      pageFn = fn;
    }
  };
  c.run(fakeframe);
  start({create: pageFn});
}