import { TextField } from "ui/text-field";
import { runComponent, elements, Component } from './turbine-native';
const { stackLayout, button, page, textField } = elements;

const textF = textField({
  behaviors: {
    textValue: {
      name: "text",
      initial: ""
    }
  }
}, "Username");

const btn = button({
  streams: {
    "tap": {
      name: "tap"
    }
  }
}, "Login");

const view = page(
  stackLayout(
    textF.chain(({textValue}) => {
      textValue.subscribe((a) => console.log(a));
      return btn.chain(({tap}) => {
        tap.log()
        return Component.of({});
      });
    })
  )
);

runComponent(view);



