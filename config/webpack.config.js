const path = require('path')
const EslintWebpackPlugin = require('eslint-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin') //将css打包成单独的文件
const CssMinimizerPlugin =require('css-minimizer-webpack-plugin') //css 压缩
const TerserWebpackPlugin =require('terser-webpack-plugin')
const ImageMinimizerPlugin =require('image-minimizer-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin') //用于react HMR js热更新
// 获取cross-env定义的环境变量
const isProduction =process.env.NODE_env==="production"
// 封装一个函数统一处理css
const getStyleLoaders = (pre) => {
  return [
    isProduction?MiniCssExtractPlugin.loader:'style-loader',
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
  entry: './src/index.js',
  output: {
    //开发模式输出到内存里，不需要指定路径 
    //生产模式输出到dist目录下
    path:isProduction?path.resolve(__dirname, "../dist"):undefined, 
    filename: isProduction?'static/js/[name].[contenthash].js':'static/js/[name].js',
    chunkFilename: isProduction?'static/js/[name].[contenthash:10].chunk.js':'static/js/[name].chunk.js',
    assetModuleFilename: 'static/media/[hash:10][ext][query]',
    clean: true, //生产模式清空上一次打包内容
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
          plugins:[!isProduction&&'react-refresh/babel'].filter(Boolean), //开发模式激活react js的hmr功能
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
    isProduction&&new MiniCssExtractPlugin({ //生产模式下将css输出为单独的文件
        filename:'static/css/[name].[contenthash:10].css',
        chunkFilename:'static/css/[name].[contenthash:10].chunk.css',
    }),
    // 生产模式下将public文件copy到dist目录下，用于处理图标等静态资源
    isProduction&&new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname,"../public"), to: path.resolve(__dirname,"../dist"),
          globOptions: {
            // 忽略html文件
            ignore: ["**/index.html"],
          }, },
        ],
      }),
      !isProduction&&new ReactRefreshWebpackPlugin() //开发模式调用react hmr插件
  ].filter(Boolean),
  //指定模式
  mode: isProduction?'production':'development',
  devtool: isProduction?'source-map':'cheap-module-source-map',
  // 为了打包体积考虑，不要将所有代码都打包到一个文件中，而是打包为多个chunk
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups:{
        // 如果项目中使用antd，此时将所有node_modules打包在一起，那么打包输出文件会比较大。
        // 所以我们将node_modules中比较大的模块单独打包，从而并行加载速度更好
        // 如果项目中没有，请删除
        // antd: {
        //     name: "chunk-antd",
        //     test: /[\\/]node_modules[\\/]antd(.*)/,
        //     priority: 30,
        //   },
          // 将react相关的库单独打包，减少node_modules的chunk体积。
          react: {
            name: "react",
            test: /[\\/]node_modules[\\/]react(.*)?[\\/]/,
            chunks: "initial",
            priority: 20,
          },
          libs: {
            name: "chunk-libs",
            test: /[\\/]node_modules[\\/]/,
            priority: 10, // 权重最低，优先考虑前面内容
            chunks: "initial",
          },
      }
    },
    runtimeChunk: {
      name: (entrypoint) => `runtime~${entrypoint.name}.js`,
    },
    // 是否需要进行压缩
    minimize:isProduction,
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
    // 配置开发模式下打开的服务器 通过package.json是否指定serve指令判断是否激活devServer
    devServer:{
        host:"localhost",
        port: 3000,
        open:true,
        hot:true, //开启热模块替换
        historyApiFallback:true, //解决前端路由刷新显示404问题
      },
      performance:false, //关闭性能分析，提升打包速度
}
