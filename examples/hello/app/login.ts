import { elements as e, modelView } from "nativescript-turbine";

function loginView({}) {
  return e.stackLayout({ style: { padding: 15 } }, [
    e.label("Username"),
    e.textField(),
    e.label("Password"),
    e.textField({
      props: { secure: true }
    }),
    e.button("Login").output({ tap: "tap" })
  ]);
}
