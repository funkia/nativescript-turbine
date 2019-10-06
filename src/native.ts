import { Page } from "tns-core-modules/ui/page";
import { Frame, topmost } from "tns-core-modules/ui/frame";
import { run } from "tns-core-modules/application";
import { sinkFuture, Future, tick, Now, Time } from "@funkia/hareactive";
import { Component, DomApi } from "./component";
import {
  LayoutBase,
  ShowModalOptions
} from "tns-core-modules/ui/layouts/layout-base";
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

type ModalOptions = Partial<Omit<ShowModalOptions, "closeCallback">> & {
  destroy?: Future<boolean>;
};
export class ShowModalNow<A extends object> extends Now<
  A & { close: Future<boolean> }
> {
  constructor(
    private component: Component<any, A>,
    private opts: ModalOptions
  ) {
    super();
  }
  run(t: Time) {
    const p = new Page();
    const closeSink = sinkFuture<boolean>();
    const close =
      "destroy" in this.opts ? closeSink.combine(this.opts.destroy) : closeSink;
    if ("destroy" in this.opts) {
      this.opts.destroy.subscribe(() => {
        p.content.closeModal();
      });
    }
    const { output } = this.component.run(new NativeViewApi(p), close, t);
    setTimeout(() => {
      topmost().showModal(p.content, {
        closeCallback() {
          closeSink.resolve(true);
        },
        context: undefined,
        ...this.opts
      });
    }, 0);
    return { ...output, close };
  }
}

export function showModal<A extends object>(
  component: Component<any, A>,
  opts: ModalOptions = {}
): Now<A & { close: Future<boolean> }> {
  return new ShowModalNow(component, opts);
}
