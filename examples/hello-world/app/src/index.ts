import { Color } from "color";
import { stackLayout, button, page, runComponent, textField } from './turbine-native';
import { go } from "@funkia/jabz";

const view = page(
  stackLayout({
    style: {
      backgroundColor: new Color("green")
    }
  }, go(function*(){
    const {tap} = yield button({style: { backgroundColor: new Color("blue")}}, "Tap here");

    tap.mapTo("Tap").log();
    yield button({style: { backgroundColor: new Color("blue")}}, "Tap here");
    yield button({style: { backgroundColor: new Color("blue")}}, "Tap here");    
    return {};
  })
    
  )
)

runComponent(view);
