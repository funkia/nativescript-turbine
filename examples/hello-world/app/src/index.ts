import { TextField } from "ui/text-field";
import { runComponent, elements, Component } from './turbine-native';
const { stackLayout, button, page, textField } = elements;

const view = page(
  stackLayout(
    textField().chain(({textValue}) => {
      return button(textValue);
    })
  )
);

runComponent(view);



