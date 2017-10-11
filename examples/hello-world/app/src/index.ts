import { runComponent, modelView, elements } from "./nativescript-turbine";
const { page, button, stackLayout, textField, label } = elements;

const login = stackLayout([
  label("Brugernavn"),
  textField(),
  label("Kode"),
  textField({ props: { secure: true } }),
  button("Login")
]);

const p = page(login);

runComponent(p);


