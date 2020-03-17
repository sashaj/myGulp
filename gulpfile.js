const { src, dest, watch, series } = require('gulp');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const browserSync = require('browser-sync').create();
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const gulpif = require('gulp-if');
const cleanCSS = require('gulp-clean-css');
const imagemin = require('gulp-imagemin');
const del = require('del');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const webpack = require('webpack-stream');
const path = require('path');

let build = false;

let webpackConfig = {
  mode: build ? 'production' : 'development',
  devtool: build ? 'none' : 'eval-source-map',
  output: {
    filename: 'main.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [path.resolve(__dirname, 'node_modules')],
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};

const sassConfig = {
  includePaths: ['src/scss'],
  errLogToConsole: true,
  outputStyle: 'nested',
  onError: browserSync.notify,
};

// Compile pug files into HTML
function html() {
  return src('src/pug/*.pug')
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(pug())
    .pipe(dest('dist'));
}

// Handle Js with Webpack
function js() {
  return src('src/js/main.js')
    .pipe(webpack(webpackConfig))
    .on('error', function handleError() {
      this.emit('end'); // Recover from errors
    })
    .pipe(dest('dist/assets/js'))
    .pipe(browserSync.stream());
}

// Compile sass files into CSS
function styles() {
  return src('src/scss/main.scss')
    .pipe(gulpif(!build, sourcemaps.init()))
    .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
    .pipe(sass(sassConfig))
    .pipe(autoprefixer())
    .pipe(gulpif(build, cleanCSS()))
    .pipe(gulpif(!build, sourcemaps.write()))
    .pipe(dest('dist/assets/css'))
    .pipe(browserSync.stream());
}

// Copy fonts
function fonts() {
  return src('src/assets/fonts/*').pipe(dest('dist/assets/fonts/'));
}
// copy images or minimise them
function images() {
  return src('src/assets/images/**/*')
    .pipe(gulpif(build, imagemin()))
    .pipe(dest('dist/assets/images'));
}

//delete dist folder before build
function clean() {
  return del(['dist/**', '!dist']);
}

async function turnBuildOn() {
  build = true;
}

async function turnBuildOff() {
  build = false;
}

// Serve and watch sass/pug/js files for changes
function watchAndServe() {
  browserSync.init({
    server: 'dist',
  });
  watch('src/scss/**/*.scss', styles);
  watch('src/pug/**/*.pug', html);
  watch('src/js/**/*.js', js);
  watch('src/assets/fonts/*', fonts);
  watch('src/assets/images/**/*', images);
  watch('dist/*.html').on('change', browserSync.reload);
}

exports.html = html;
exports.styles = styles;
exports.watch = watchAndServe;
exports.build = series(turnBuildOn, clean, html, styles, js, fonts, images);
exports.default = series(turnBuildOff, html, styles, js, fonts, images, watchAndServe);
