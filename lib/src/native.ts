import { Page } from "tns-core-modules/ui/page";
import { View } from "tns-core-modules/ui/core/view";
import { Frame } from "tns-core-modules/ui/frame";
import { run } from "tns-core-modules/application";
import { sinkFuture, Future, tick } from "@funkia/hareactive";
import { Component, DomApi } from "./component";
import { LayoutBase } from "tns-core-modules/ui/layouts/layout-base";
import { Label } from "tns-core-modules/ui/label/label";
import { NativeViewApi } from "./ui-builder";

export function runComponent(component: any) {
  const destroyed = sinkFuture<boolean>();
  run({
    create() {
      const frame = new Frame();
      const api = new NativeViewApi(frame);
      component.run(api, destroyed);
      return frame;
    }
  });
}

export function testComponent<O, A>(
  component: Component<O, A>,
  time = tick()
): {
  output: A;
  page: Page;
  available: O;
  destroy: (toplevel: boolean) => void;
} {
  const page = new Page();
  const destroyed = sinkFuture<boolean>();
  const { output, available } = component.run(page as any, destroyed, time);
  const destroy = destroyed.resolve.bind(destroyed);
  return { output, available, page, destroy };
}

export class FixedDomPosition<A> implements DomApi<A> {
  fixpoint: any;
  parent;
  constructor(public api: DomApi<A>, destroy: Future<boolean>) {
    if (!(api.parent instanceof LayoutBase)) {
      return;
    }
    this.parent = api.parent;
    this.fixpoint = new Label();
    this.fixpoint.text = "Fixed point";
    this.fixpoint.visibility = "collapse";
    api.appendChild(this.fixpoint);
    destroy.subscribe(() => api.removeChild(this.fixpoint));
  }
  appendChild(child: A): void {
    if (this.api.parent instanceof LayoutBase) {
      this.api.insertBefore(child, this.fixpoint);
    } else {
      this.api.appendChild(child);
    }
  }
  insertBefore(e: A, a: A): void {
    this.api.insertBefore(e, a);
  }
  removeChild(c: A): void {
    this.api.removeChild(c);
  }
}
