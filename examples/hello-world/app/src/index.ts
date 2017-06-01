import { Color } from "color";
import { runComponent, page, absoluteLayout, button } from "./turbine-native";

const view = page(
  absoluteLayout({
    style: {
      backgroundColor: new Color("green")
    }
  },
    button({
      style: {
        backgroundColor: new Color("blue")
      }
    }, "Tap here")
  )
)

runComponent(view);
