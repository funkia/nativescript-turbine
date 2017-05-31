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

class PageComp extends Component<{}, any> {
  constructor(private content: Component<any, Page>) {
    super();
  }
  run(frame: Frame) {
    const p = new Page();
    p.backgroundColor = new Color("blue");
    this.content.run(p);
    frame.navigate(() => p);
    return {};
  }
}

function page(content: Component<any, Page>) {
  return new PageComp(content);
};

class BtnComp extends Component<{}, any> {
  constructor(private text: string) {
    super();
  }
  run(view: Page): any {
    console.log('Butn')
    const b = new Button();
    b.addEventListener("click", console.log);
    b.text = this.text;//this.text;
    view.content = b;
    return {};
  }
}

function button(text: string) {
  return new BtnComp(text);
}

runComponent(page(button("virker")));

/*
const b = new Button();
b.addEventListener("click", console.log);
b.text = "her";

const p = new Page();
p.content = b;


start({create: () => p})

*/