import { sequence } from "@funkia/jabz";
import { PageComponent } from "./elements";
import { Page } from "tns-core-modules/ui/page";
import { Frame } from "tns-core-modules/ui/frame";
import { start } from "tns-core-modules/application";
import { Component, isComponent } from "./component";

export function runComponent<A>(c: PageComponent) {
  let pageFn;
  const fakeframe = <Frame>{
    navigate: function(fn: () => Page) {
      pageFn = fn;
    }
  };
  c.run(fakeframe);
  start({create: pageFn});
}

export function toComponent(c: any): Component<any, any> {
  if (isComponent(c)) return c;
  if (Array.isArray(c)) return sequence(Component, c.map(toComponent)).map((res: any[]) => res.reduce(Object.assign, {}));
}