import {
  producerStream,
  producerBehavior,
  Stream,
  Behavior,
  observe
} from "@funkia/hareactive";
import { Observable, EventData } from "tns-core-modules/data/observable";
import { FPSCallback } from "tns-core-modules/fps-meter/fps-native";
import { Showable } from "@funkia/turbine/dist/cmjs/component";

/*
 * Converts a NativeScript observable into a behavior
 */
export function streamFromObservable<A>(
  observable: Observable,
  event: string,
  extractor: (a: EventData) => A
): Stream<A> {
  return producerStream<A>(push => {
    const handler = (e: any) => {
      push(extractor(e.value));
    };
    observable.on(event, handler);
    return () => {
      observable.off(event, handler);
    };
  });
}

export function behaviorFromObservable<A>(
  observable: Observable,
  event: string,
  initial: A,
  extractor: (e: EventData) => A
): Behavior<A> {
  let value: A = initial;
  return producerBehavior<A>(
    pull => {
      const handler = (e: any) => {
        value = extractor(e.value);
        pull(value);
      };
      observable.on(event, handler);
      return () => {
        observable.off(event, handler);
      };
    },
    () => value
  );
}

function pullOnFrame(pull: (t?: number) => void): () => void {
  let fps = new FPSCallback(() => pull());
  fps.start();
  return () => fps.stop();
}

export function viewObserve<A extends Showable>(
  update: (a: A) => void,
  behavior: Behavior<A>
) {
  observe(update, pullOnFrame, behavior);
}
