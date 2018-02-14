//var application = require("application");
//var page = require("ui/page");

import * as application from "application";
import * as page from "ui/page";
import * as J from "@funkia/jabz";

var p = new page.Page();
p.backgroundColor = "blue";

console.log("Tekst", J.isEmpty([]));

application.start({
  create: function() {
    return p;
  }
});
