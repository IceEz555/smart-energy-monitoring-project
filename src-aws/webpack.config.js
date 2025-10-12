const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
module.exports = {
    mode: 'production',
    entry: slsw.lib.entries,
    target: 'node',
    devtool: 'source-map',
    externals: [nodeExternals({
        whitelist: ['graphql', 'graphql-fields']
    })] // exclude external modules
};