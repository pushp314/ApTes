import {
  select_default
} from "./chunk-V325GGRI.js";
import {
  __name
} from "./chunk-IHMUD2WH.js";

// node_modules/mermaid/dist/chunks/mermaid.core/chunk-XXDRQBXY.mjs
var getDiagramElement = __name((id, securityLevel) => {
  let sandboxElement;
  if (securityLevel === "sandbox") {
    sandboxElement = select_default("#i" + id);
  }
  const root = securityLevel === "sandbox" ? select_default(sandboxElement.nodes()[0].contentDocument.body) : select_default("body");
  const svg = root.select(`[id="${id}"]`);
  return svg;
}, "getDiagramElement");

export {
  getDiagramElement
};
//# sourceMappingURL=chunk-R5DNT7O4.js.map
