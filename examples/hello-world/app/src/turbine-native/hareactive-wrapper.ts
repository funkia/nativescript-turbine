import { producerStream, Stream, producerBehavior, Behavior } from "@funkia/hareactive";
import { Observable, EventData } from "data/observable";

export function streamFromObservable(observable: Observable, event: string): Stream<EventData> {
  return producerStream<EventData>(push => {
    observable.on(event, push);
    return () => {observable.off(event, push)};
  });
}

/*
export function behaviorFromObservable(observable: Observable, event: string): Behavior<EventData> {
  return producerBehavior<EventData>(push => {
    observable.on(event, push);
    return () => {observable.off(event, push)};
  });
}
*/