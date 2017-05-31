import { start } from 'application';
import { Page } from "ui/page";
import { AbsoluteLayout } from "ui/layouts/absolute-layout";
import { Color } from "color";
import { Button } from "ui/button";
import { View } from "ui/core/view";
import { Frame } from "ui/frame";
import { Component } from "./component";
import { Now } from "@funkia/hareactive";

function runComponent<A>(c: PageComp) {
  let pageFn;
  const fakeframe = <Frame>{
    navigate: function(fn: () => Page) {
      pageFn = fn;
    }
  };
  c.run(fakeframe);
  start({create: pageFn});
}

class PageComp extends Component<{}, Frame> {
  constructor() {
    super();
  }
  run(frame: Frame) {
    const p = new Page();
    p.backgroundColor = new Color("blue");
    frame.navigate(() => p);
    return {};
  }
}

function page() {
  return new PageComp();
};

const b = new Button();
b.text = "her";

runComponent(page());
