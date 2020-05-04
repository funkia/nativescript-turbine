import { Page } from "tns-core-modules/ui/page";
import { Frame } from "tns-core-modules/ui/frame";
import { run } from "tns-core-modules/application";
import {
  sinkFuture,
  Future,
  tick,
  Now,
  Time,
  placeholder,
  combine,
} from "@funkia/hareactive";
import { Component, DomApi } from "./component";
import {
  LayoutBase,
  ShowModalOptions,
} from "tns-core-modules/ui/layouts/layout-base";
import { Label } from "tns-core-modules/ui/label/label";
import { NativeViewApi } from "./ui-builder";
import { never } from "./utils";

export function runComponent(component: any) {
  const destroyed = sinkFuture<boolean>();
  run({
    create() {
      const frame = new Frame();
      const api = new NativeViewApi(frame);
      component.run(api, destroyed);
      return frame;
    },
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
  parent: any;
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

export type ModalOptions<B> = Partial<
  Omit<ShowModalOptions, "closeCallback">
> & {
  closeModal?: Future<B>;
};

class ShowModalNow<A extends object, B> extends Now<
  A & { closeModal: Future<B | undefined> }
> {
  constructor(
    private component: Component<any, A & { closeModal?: Future<B> }>,
    private opts: ModalOptions<B>
  ) {
    super();
  }
  run(t: Time) {
    const p = new Page();
    const nativeClose = sinkFuture<undefined>();
    const closeFromOpts =
      this.opts.closeModal !== undefined ? this.opts.closeModal : never;
    const codeCloseP = placeholder<B>();
    const closeModal = combine(nativeClose, codeCloseP).mapTo(true);
    const { output } = this.component.run(new NativeViewApi(p), closeModal, t);
    const closeFromOutput =
      output.closeModal !== undefined ? output.closeModal : never;
    const codeClose = closeFromOutput.combine(closeFromOpts);
    codeCloseP.replaceWith(codeClose);

    setTimeout(() => {
      Frame.topmost().showModal(p.content, {
        closeCallback() {
          nativeClose.resolve(undefined);
        },
        context: undefined,
        ...this.opts,
      });
      codeClose.subscribe(() => {
        p.content.closeModal();
      });
    }, 0);
    return { closeModal, ...output };
  }
}

export function showModal<A extends object, B = any>(
  component: Component<any, A & { closeModal?: Future<B> }>,
  opts: ModalOptions<B> = {}
): Now<A & { closeModal: Future<B | undefined> }> {
  return new ShowModalNow(component, opts);
}
