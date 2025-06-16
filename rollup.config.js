import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import pkg from "./package.json" with { type: "json" };

const banner = `/*!
  * yawl v${pkg.version}
  * ${pkg.description}
  * ${pkg.repository.url}
  * ${pkg.license} License
  */
`;
const input = "src/index.js";
const outputName = "yawl";

// TODO: Remove minified build if not needed
// const minBanner = `/*! yawl v${pkg.version} | ${pkg.license} License */`;
// const bubleOptions = {
//   transforms: {
//     asyncAwait: false,
//   },
// };

export default [
  {
    input: input,
    output: {
      name: outputName,
      file: pkg.main,
      format: "umd",
      banner: banner,
    },
    plugins: [resolve(), commonjs()],
  },
  // TODO: Remove minified build if not needed
  // {
  //   input: input,
  //   output: {
  //     name: outputName,
  //     file: "dist/yawl.min.js",
  //     format: "umd",
  //     banner: minBanner,
  //   },
  //   plugins: [resolve(), terser()],
  // },
  {
    input: input,
    output: {
      file: pkg.module,
      format: "es",
      banner: banner,
    },
    plugins: [],
  },
];
