import { runComponent, elements as E, component } from "../../../src";
import * as H from "@funkia/hareactive";
import { setCssFileName } from "tns-core-modules/application";
import "./style.css";
setCssFileName("./style.css");

function add(a: number, b: number) {
  return a + b;
}

type On = { tap: H.Stream<any> };

const count = component<On>((on, start) => {
  const left = start(H.accum(add, 42, on.tap.mapTo(-1)));
  const message = left.map(n =>
    n > 0
      ? `${n} taps left`
      : "Hoorraaay! You unlocked the NativeScript clicker achievement!"
  );

  return E.stackLayout({ class: "p-20" }, [
    E.label({ class: "h1 text-center" }, "Tap the button"),
    E.button({ class: "btn btn-primary btn-active" }, "TAP").use({
      tap: "tap"
    }),
    E.label({ class: "h2 text-center", textWrap: true }, message)
  ]);
});

const app = E.page([
  E.actionBar({ title: "My App", class: "action-bar" }),
  count
]);

runComponent(app);
