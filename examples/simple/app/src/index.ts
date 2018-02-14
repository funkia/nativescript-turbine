import { runComponent, modelView, elements } from "./nativescript-turbine";
const { page, button, stackLayout, textField, label } = elements;

const login = stackLayout(
  {
    style: {
      padding: 20
    }
  },
  [
    label("Username"),
    textField(),
    label("Password"),
    textField({ props: { secure: true } }),
    button("Login")
  ]
);

const p = page(login);

runComponent(p);
