import {
  producerStream,
  producerBehavior,
  Stream,
  Behavior,
  observe,
  stepperFrom
} from "@funkia/hareactive";
import {
  Observable,
  EventData,
  PropertyChangeData
} from "tns-core-modules/data/observable";
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

// Might be useful
export function behaviorFromObservableProperty<A>(
  observable: Observable,
  propertyName: string,
  initial: A,
  extractor: (e: any) => A
): Behavior<Behavior<A>> {
  const change = <Stream<PropertyChangeData>>(
    streamFromObservable(observable, Observable.propertyChangeEvent, a => a)
  );
  const values = change
    .filter(evt => evt.propertyName === propertyName)
    .map(evt => extractor(evt.value));
  return stepperFrom(initial, values);
}

export function behaviorFromObservable<A>(
  observable: Observable,
  event: string,
  initial: A,
  extractor: (e: EventData) => A
): Behavior<Behavior<A>> {
  const change = streamFromObservable(observable, event, extractor);
  return stepperFrom(initial, change);
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
