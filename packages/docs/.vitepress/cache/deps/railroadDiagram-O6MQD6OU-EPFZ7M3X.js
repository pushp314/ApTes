import {
  db,
  getStyles,
  renderer
} from "./chunk-TPRLBLPO.js";
import {
  populateCommonDb
} from "./chunk-NVROMNW3.js";
import {
  MermaidParseError
} from "./chunk-B36LEZER.js";
import {
  createRailroadServices
} from "./chunk-HP633VVU.js";
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
import "./chunk-VDDTQ55J.js";
import "./chunk-5N5YC32G.js";
import {
  log
} from "./chunk-V325GGRI.js";
import {
  __name
} from "./chunk-IHMUD2WH.js";
import "./chunk-EQCVQC35.js";

// node_modules/mermaid/dist/chunks/mermaid.core/railroadDiagram-O6MQD6OU.mjs
var langiumParser = createRailroadServices().Railroad.parser.LangiumParser;
var transformExpression = __name((expr) => {
  switch (expr.$type) {
    case "RailroadTerminalExpr":
      return {
        type: "terminal",
        value: expr.value
      };
    case "RailroadNonTerminalExpr":
      return {
        type: "nonterminal",
        name: expr.name
      };
    case "RailroadSpecialExpr":
      return {
        type: "special",
        text: expr.text
      };
    case "RailroadSequenceExpr": {
      const elements = expr.elements.map(transformExpression);
      return elements.length === 1 ? elements[0] : { type: "sequence", elements };
    }
    case "RailroadChoiceExpr": {
      const alternatives = expr.alternatives.map(transformExpression);
      return alternatives.length === 1 ? alternatives[0] : { type: "choice", alternatives };
    }
    case "RailroadOptionalExpr":
      return {
        type: "optional",
        element: transformExpression(expr.element)
      };
    case "RailroadOneOrMoreExpr":
      return {
        type: "repetition",
        element: transformExpression(expr.element),
        min: 1,
        max: Infinity
      };
    case "RailroadZeroOrMoreExpr":
      return {
        type: "repetition",
        element: transformExpression(expr.element),
        min: 0,
        max: Infinity
      };
    default:
      throw new Error(`Unsupported railroad expression: ${expr.$type}`);
  }
}, "transformExpression");
var transformRule = __name((rule) => {
  return {
    name: rule.name,
    definition: transformExpression(rule.definition)
  };
}, "transformRule");
var populateDb = __name((ast) => {
  populateCommonDb(ast, db);
  if (ast.title) {
    db.setTitle(ast.title);
  }
  ast.rules.map((rule) => db.addRule(transformRule(rule)));
}, "populateDb");
var parser = {
  parse: __name((input) => {
    db.clear();
    log.debug("[Railroad Parser] Starting Langium parse");
    const result = langiumParser.parse(input);
    if (result.lexerErrors.length > 0 || result.parserErrors.length > 0) {
      throw new MermaidParseError(result);
    }
    const ast = result.value;
    log.debug("[Railroad Parser] Parsed rules:", ast.rules.length);
    populateDb(ast);
    log.debug("[Railroad Parser] Parse complete");
  }, "parse"),
  parser: {
    yy: db
  }
};
var diagram = {
  parser,
  db,
  renderer,
  styles: getStyles
};
var railroadDiagram_default = diagram;
export {
  railroadDiagram_default as default,
  diagram
};
//# sourceMappingURL=railroadDiagram-O6MQD6OU-EPFZ7M3X.js.map
