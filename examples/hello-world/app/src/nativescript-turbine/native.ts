//import { sequence } from "@funkia/jabz";
import { PageComponent } from "./elements";
import { Page } from "ui/page";
import { Frame } from "ui/frame";
import { start } from "application";
import { Component, isComponent } from "./component";
import { sequence } from "../jabz";

export function runComponent<A>(c: PageComponent) {
  let pageFn;
  const fakeframe = <Frame>{
    navigate: function (fn: () => Page) {
      pageFn = fn;
    }
  };
  c.run(fakeframe);
  start({ create: pageFn });
}

export function toComponent(c: any): Component<any, any> {
  if (isComponent(c)) return c;
  if (Array.isArray(c)) return sequence(Component, c.map(toComponent)).map((res: any[]) => res.reduce(Object.assign, {}));
}