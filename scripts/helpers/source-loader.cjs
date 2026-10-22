const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { transformSync } = require("@babel/core");

module.exports = function createLoader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (!fs.existsSync(file)) file += fs.existsSync(file + ".js") ? ".js" : ".jsx";
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const plugins = ["@babel/plugin-transform-modules-commonjs"];
    if (file.endsWith(".jsx")) plugins.unshift(["@babel/plugin-transform-react-jsx", { runtime: "automatic" }]);
    const { code } = transformSync(fs.readFileSync(file, "utf8"), { filename: file, configFile: false, babelrc: false, plugins });
    vm.runInNewContext(code, {
      module, exports: module.exports, console, process,
      setTimeout, clearTimeout, setInterval, clearInterval, AbortController,
      ...globals,
      require(spec) {
        if (Object.prototype.hasOwnProperty.call(mocks, spec)) return mocks[spec];
        if (spec.startsWith(".")) return load(path.resolve(path.dirname(file), spec));
        throw new Error("Unexpected test import: " + spec);
      },
    }, { filename: file });
    return module.exports;
  }
  return load;
};
