
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  entry: 'public/main.js',
  format: 'umd',
  sourceMap: true,
  plugins: [
    resolve(),
    babel({
      //exclude: 'node_modules/**' // only transpile our source code
    })
  ],
  dest: 'public/main.build.js'
};