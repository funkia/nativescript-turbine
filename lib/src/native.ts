import { Page } from "ui/page";
import { Frame } from "ui/frame";
import { run } from "application";

export function runComponent<A>(c: any) {
  let pageFn;
  const fakeframe = <Frame>{
    navigate: function(fn: () => Page) {
      pageFn = fn;
    }
  };
  c.run(fakeframe);
  run({ create: pageFn });
}
