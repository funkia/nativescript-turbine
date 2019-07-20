import { runComponent, elements as e, modelView } from "nativescript-turbine";
import * as H from "@funkia/hareactive";
import { setCssFileName } from "tns-core-modules/application";
import "./style.css";
setCssFileName("./style.css");

function add(a: number, b: number) {
  return a + b;
}

type Model = {
  tap: H.Stream<any>;
};

function model({ tap }: Model) {
  const leftFromNow = H.accum(add, 42, tap.mapTo(-1));
  return leftFromNow.map(left => ({ left }));
}

function tapView({ left }: { left: H.Behavior<number> }) {
  const message = left.map(l =>
    l > 0
      ? `${l} taps left`
      : "Hoorraaay! You unlocked the NativeScript clicker achievement!"
  );

  return e.stackLayout({ class: "p-20" }, [
    e.label({ class: "h1 text-center" }, "Tap the button"),
    e
      .button({ class: "btn btn-primary btn-active" }, "TAP")
      .output({ tap: "tap" }),
    e.label({ class: "h2 text-center", textWrap: true }, message)
  ]);
}

const count = modelView(model, tapView);

const app = e.page([
  e.actionBar({ title: "My App", class: "action-bar" }),
  count()
]);

runComponent(app);
