import { runComponent, elements, Component, loop, modelView } from "../../../../src";

const { stackLayout, button, page, textField } = elements;
import { Now } from "@funkia/hareactive";

const login = loop(({textValue}) => stackLayout([
  textField(),
  button(textValue)
]));

const view = page(login);

const c = modelView(({}) => Now.of({}), ({}) => view)();

runComponent(c);
