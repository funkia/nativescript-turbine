import { runComponent, elements as e, modelView } from "nativescript-turbine";

const login = e.stackLayout(
  {
    style: {
      padding: 20
    }
  },
  [
    e.label("Usernamse"),
    e.textField(),
    e.label("Password"),
    e.textField({ props: { secure: true } }),
    e.button("Login")
  ]
);

const p = e.page(login);

runComponent(p);
