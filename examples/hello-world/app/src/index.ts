import { Color } from "color";
import { runComponent, elements } from './turbine-native';
const { stackLayout, button, page, textField } = elements;

const view = page(
  stackLayout([
    textField("Username"),
    textField("Password"),
    button("Login")
  ])
);

runComponent(view);
