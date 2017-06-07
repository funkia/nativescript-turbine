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
}, "");

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
      return button(textValue);
    })
  )
);

runComponent(view);



