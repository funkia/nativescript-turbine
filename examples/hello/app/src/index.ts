import { runComponent, elements as e, modelView } from "nativescript-turbine";
import { Now } from "@funkia/hareactive";

function loginModel({ tap }) {
  tap.log("asd");
  return Now.of({});
}

function loginView({}) {
  return e.stackLayout(
    {
      style: {
        padding: 15
      }
    },
    [
      e.label("Username"),
      e.textField(),
      e.label("Password"),
      e.textField({
        props: { secure: true }
      }),
      e.button("Login").output({ tap: "tap" })
    ]
  );
}

const login = modelView(loginModel, loginView);

const p = e.page(login());

runComponent(p);
