const path = require('path')
const EslintWebpackPlugin = require('eslint-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin') //将css打包成单独的文件
const CssMinimizerPlugin =require('css-minimizer-webpack-plugin') //css 压缩
const TerserWebpackPlugin =require('terser-webpack-plugin')
const ImageMinimizerPlugin =require('image-minimizer-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");

// 封装一个函数统一处理css
const getStyleLoaders = (pre) => {
  return [
    MiniCssExtractPlugin.loader,
    'css-loader',
    {
      //处理样式兼容性 需要配合package.json中的browserslist使用
      //在package.json中browserslist指定兼容性做到什么程度“last 2 version >1% not dead”
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: ['postcss-preset-env'],
        },
      },
    },
    pre,
  ].filter(Boolean) //filter(Boolean)作用，过滤数组中undefined值，因为处理css时候不需要传参数，pre为undefined
}

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, "../dist"), //开发模式输出到内存里，不需要指定路径
    filename: 'static/js/[name].[contenthash].js',
    chunkFilename: 'static/js/[name].[contenthash:10].chunk.js',
    assetModuleFilename: 'static/media/[hash:10][ext][query]',
    clean: true, //清空上一次打包内容
  },
  module: {
    rules: [
      //处理css
      {
        test: /\.css$/,
        use: getStyleLoaders(),
      },
      // less
      {
        test: /\.less$/,
        use: getStyleLoaders('less-loader'),
      },
      // sass
      {
        test: /\.s[ac]ss$/,
        use: getStyleLoaders('sass-loader'),
      },
      // stylus
      {
        test: /\.styl$/,
        use: getStyleLoaders('stylus-loader'),
      },
      //处理图片
      {
        test: /\.(jpe?g|png|gif|webp|svg)/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024, //将小于10kb图片转换为base64格式保存在js文件中，减少请求数量提高性能
          },
        },
      },
      // 处理字体文件
      {
        test: /\.(woff2?|ttf)$/,
        type: 'asset/resource',
      },
      //处理js
      // 配置babel 配合babel.config.js
      {
        test: /\.jsx?$/,
        include: path.resolve(__dirname, '../src'),
        loader: 'babel-loader',
        options: {
          cacheDirectory: true, //开启缓存 第二次打包速度更快
          cacheCompression: false, //关闭缓存压缩
        },
      },
    ],
  },

  plugins: [
    // 配置eslint 配合.eslintrc.js使用
    new EslintWebpackPlugin({
      context: path.resolve(__dirname, '../src'), //指明eslint处理文件范围
      exclude: 'node_modules', //排除node_module
      cache: true, //开启缓存,第二次打包性能更好
      cacheLocation: path.resolve(
        __dirname,
        '../node_modules/.cache/.eslintcache'
      ),
    }),
    //处理html
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../public/index.html'),
    }),
    new MiniCssExtractPlugin({ //将css输出为单独的文件
        filename:'static/css/[name].[contenthash:10].css',
        chunkFilename:'static/css/[name].[contenthash:10].chunk.css',
    }),
    // 将public文件copy到dist目录下，用于处理图标等静态资源
    new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname,"../public"), to: path.resolve(__dirname,"../dist"),
          globOptions: {
            // 忽略html文件
            ignore: ["**/index.html"],
          }, },
        ],
      }),
  ],
  //指定模式为生产模式
  mode: 'production',
  devtool: 'source-map',
  // 为了打包体积考虑，不要将所有代码都打包到一个文件中，而是打包为多个chunk
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    runtimeChunk: {
      name: (entrypoint) => `runtime~${entrypoint.name}.js`,
    },
    minimizer:[new CssMinimizerPlugin(),new TerserWebpackPlugin()  , new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: [
              ["gifsicle", { interlaced: true }],
              ["jpegtran", { progressive: true }],
              ["optipng", { optimizationLevel: 5 }],
              [
                "svgo",
                {
                  plugins: [
                    "preset-default",
                    "prefixIds",
                    {
                      name: "sortAttrs",
                      params: {
                        xmlnsOrder: "alphabetical",
                      },
                    },
                  ],
                },
              ],
            ],
          },
        },
      }),], //压缩css和js
  },
  // webpack解析加载模块加载选项
  resolve: {
    // 自动补全文件扩展名
    extensions: ['.jsx', '.js', '.json'],
  },
}
