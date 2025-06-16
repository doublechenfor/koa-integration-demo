const path = require('path');
const nodeExternals = require('webpack-node-externals')

module.exports = {
    target: 'node',
    entry: './koa-server.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist') 
    },
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.js/,
                use: {
                    loader: 'babel-loader',
                }
            }
        ]
    }
}


