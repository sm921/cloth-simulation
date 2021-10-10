const base = (name) => ({
  mode: "development",
  devtool: "inline-source-map",
  entry: `./ts/${name}/${name}-main.ts`,
  output: {
    filename: `${name}.js`,
    path: `${__dirname.replace("configs", "")}/dist`,
  },
  resolve: { extensions: [".ts", ".js"] },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: `configs/${name}.json`,
            },
          },
        ],
      },
    ],
  },
});

module.exports = base;
