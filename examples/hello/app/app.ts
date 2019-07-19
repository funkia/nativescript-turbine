import { runComponent, elements as e, modelView } from "nativescript-turbine";
import * as H from "@funkia/hareactive";
import { setCssFileName } from "tns-core-modules/application";
import "./style.css";
import { ActionBar, NavigationButton } from "tns-core-modules/ui/action-bar";
setCssFileName("./style.css");

function add(a: number, b: number) {
  return a + b;
}

type Model = {
  tap: H.Stream<any>;
  date: H.Behavior<any>;
};

function model({ tap }: Model) {
  const leftFromNow = H.accum(add, 42, tap.mapTo(-1));
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
    e
      .button({ class: "btn btn-primary btn-active" }, "TAP")
      .output({ tap: "tap" }),
    e.label({ class: "h2 text-center", props: { textWrap: true } }, message)
  ]);
}

const count = modelView(model, tapView);

// TODO Make ActionBar an element
const newActionBar = new ActionBar();
newActionBar.title = "My App";
newActionBar.set("icon", "");
newActionBar.cssClasses.add("action-bar");
const newNavigaitonButton = new NavigationButton();
newNavigaitonButton.text = "Go Back";
newActionBar.navigationButton = newNavigaitonButton;

const p = e.page({ actionBar: newActionBar }, count());

runComponent(p);
