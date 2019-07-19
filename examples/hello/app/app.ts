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
  date: H.Behavior<any>;
};

function model({ tap }: Model) {
  const leftFromNow = H.scan(add, 42, tap.mapTo(-1));
  // date.log("date");
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
    // e
    //   .datePicker()
    //   .output({ date: "date" })
    //   .map(c => {
    //     c.date.log();
    //     return c;
    //   }),
    e
      .button({ class: "btn btn-primary btn-active" }, "TAP")
      .output({ tap: "tap" }),
    e.label({ class: "h2 text-center", props: { textWrap: true } }, message)
  ]);
}

const count = modelView(model, tapView);

const p = e.page(count());

runComponent(p);
