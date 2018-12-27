//import { sequence } from "../../jabz";
//import { PageComponent } from "./elements";
import { Page } from "ui/page";
import { Frame } from "ui/frame";
import { start } from "application";

export function runComponent<A>(c: any) {
  let pageFn;
  const fakeframe = <Frame>{
    navigate: function(fn: () => Page) {
      pageFn = fn;
    }
  };
  c.run(fakeframe);
  start({ create: pageFn });
}
