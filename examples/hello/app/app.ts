import { runComponent, elements as e, modelView } from "nativescript-turbine";
import * as H from "@funkia/hareactive";
import { setCssFileName } from "tns-core-modules/application";
import "./style.css";
setCssFileName("./style.css");

function add(a: number, b: number) {
  return a + b;
}

type ModelProps = { tap: H.Stream<any> };

function model({ tap }: ModelProps) {
  const leftFromNow = H.accum(add, 42, tap.mapTo(-1));
  return leftFromNow.map(left => ({ left }));
}

type ViewProps = { left: H.Behavior<number> };

function view({ left }: ViewProps) {
  const message = left.map(n =>
    n > 0
      ? `${n} taps left`
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

const count = modelView(model, view);

const app = e.page([
  e.actionBar({ title: "My App", class: "action-bar" }),
  count()
]);

runComponent(app);
