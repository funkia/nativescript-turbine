import { runComponent, elements as e } from "nativescript-turbine";

const login = e.stackLayout(
  {
    style: {
      padding: 20
    }
  },
  [
    e.label("Username"),
    e.textField(),
    e.label("Password"),
    e.textField({ props: { secure: true } }),
    e.button("Login")
  ]
);

const p = e.page(login);

runComponent(p);
