import {
  parse
} from "./chunk-B36LEZER.js";
import "./chunk-HP633VVU.js";
import "./chunk-SRKBHS4X.js";
import "./chunk-FPJPUDVU.js";
import "./chunk-TIYAHNFD.js";
import "./chunk-UXFNC4L4.js";
import "./chunk-4YR22FSE.js";
import "./chunk-L5CU5NVB.js";
import "./chunk-N63476KX.js";
import "./chunk-NCF5U2YG.js";
import "./chunk-JMPROEFD.js";
import "./chunk-OU77AXDY.js";
import "./chunk-WEEQ2WKE.js";
import "./chunk-NXL73LHD.js";
import "./chunk-3DPFC4NJ.js";
import "./chunk-BRFQQHDF.js";
import "./chunk-YYEPSYK6.js";
import {
  selectSvgElement
} from "./chunk-VDDTQ55J.js";
import {
  configureSvgSize
} from "./chunk-5N5YC32G.js";
import {
  log
} from "./chunk-V325GGRI.js";
import {
  __name
} from "./chunk-IHMUD2WH.js";
import "./chunk-EQCVQC35.js";

// node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-RXCK75RN.mjs
var parser = {
  parse: __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};
var DEFAULT_INFO_DB = {
  version: "11.17.0" + (true ? "" : "-tiny")
};
var getVersion = __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};
var draw = __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
//# sourceMappingURL=infoDiagram-RXCK75RN-YMBZNZRA.js.map
