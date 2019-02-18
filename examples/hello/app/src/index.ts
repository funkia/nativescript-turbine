import { runComponent, elements as e, modelView } from "nativescript-turbine";
import * as H from "@funkia/hareactive";
import { setCssFileName } from "application";
import { Now, Behavior } from "@funkia/hareactive";
setCssFileName("app.css");

function add(a: number, b: number) {
  return a + b;
}

function model({ tap }: { tap: H.Stream<any> }) {
  const left = H.scan(add, 42, tap.mapTo(-1));
  const leftFromNow = H.sample(left);
  return leftFromNow.map(left => ({ left }));
}

// <Page.actionBar>
//     <ActionBar title="My App" icon="" class="action-bar">
//     </ActionBar>
// </Page.actionBar>

function tapView({ left }: { left: Behavior<number> }) {
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

const p = e.page(count());

runComponent(p);
