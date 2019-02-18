import { producerStream, Stream, Behavior, observe } from "@funkia/hareactive";
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
  _observable: any,
  _property: string,
  initial: A,
  _extractor: (e: EventData) => A
): Behavior<A> {
  return Behavior.of(initial);
  // FIXME
  // const model = new Observable();
  // observable.bind(
  //   {
  //     sourceProperty: property,
  //     targetProperty: property,
  //     twoWay: true
  //   },
  //   model
  // );

  // return producerBehavior<A>(push => {
  //   const handler = (e: any) => {
  //     if (property === e.propertyName) {
  //       push(extractor(e.value));
  //     }
  //   };
  //   model.on(Observable.propertyChangeEvent, handler);
  //   return () => {
  //     model.off(Observable.propertyChangeEvent, handler);
  //   };
  // }, initial);
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
