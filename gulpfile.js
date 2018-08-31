// Gulp and node
const gulp = require('gulp');
const cp = require('child_process');

// Basic workflow plugins
const browserSync = require('browser-sync');
const sass = require('gulp-sass');
const jekyll = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
const messages = {
    jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build'
};

// Performance workflow plugins
const htmlmin = require('gulp-htmlmin');
const prefix = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const critical = require('critical');

// Image Generation TODO
const responsive = require('gulp-responsive');
const $ = require('gulp-load-plugins')();
const rename = require('gulp-rename');
const imagemin = require('gulp-imagemin');

const src = {
  css: '_sass/style.scss',
  csslib: '_csslib/*',
  js: '_js/**/*.js',
  data: 'data/**/*',
  img: '_img/**/*'
}
const dist = {
  css: '_site/assets/css',
  js: '_site/assets/js',
  jslib: '_site/assets/js/libs',
  data: '_site/data',
  img: '_site/assets/img'
}

const assets = {
  css: 'assets/css',
  js: 'assets/js',
  jslib: 'assets/js/libs',
  data: 'assets/data',
  img: 'assets/img'
}


var gutil = require('gulp-util');


// Build the Jekyll Site
gulp.task('build', function (done) {
    browserSync.notify(messages.jekyllBuild);
    return cp.spawn( jekyll , ['build'], {stdio: 'inherit'})
        .on('close', done);
});

gulp.task('deploy', ['rebuild'], function () {
    return gulp.src('./_site/**/*')
        .pipe(deploy());
});

// Rebuild Jekyll & do page reload
gulp.task('rebuild', ['sass','js','jslib','img','build'], function () {
    browserSync.reload();
});

// Rebuild Jekyll & do page reload
gulp.task('browser-sync', ['build'], function() {
    browserSync({
        server: {
            baseDir: '_site'
        }
    });
});

// Compile SCSS to CSS & Prefix
gulp.task('sass',['csslib'], function() {
  return gulp.src(src.css)
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded',
      includePaths: ['scss'],
      // functions: sassFunctions(),
      onError: browserSync.notify
    }))
    .pipe(prefix())
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(dist.css))
    .pipe(gulp.dest(assets.css))
    .pipe(browserSync.reload({ stream: true }))
});

gulp.task('csslib',function() {
  return gulp.src(src.csslib)
    .pipe(gulp.dest(dist.css))
    .pipe(gulp.dest(assets.css))
    .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); });
});

gulp.task('jslib', function(){
  return gulp.src([
      // ITSB JS Libraries
      'node_modules/jquery/dist/jquery.js',
      'node_modules/d3/d3.js',
      'node_modules/d3-collection/build/d3-collection.js',
      'node_modules/d3-queue/build/d3-queue.js',
      'node_modules/lunr/lunr.js',
      // Jekyll Libraries
      'node_modules/lazysizes/plugins/unveilhooks/ls.unveilhooks.js',
      'node_modules/lazysizes/lazysizes.js',
      'node_modules/velocity-animate/velocity.js',
    ])
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(dist.jslib))
    .pipe(gulp.dest(assets.jslib))
    .pipe(browserSync.reload({stream: true}))
    .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); });
});

// Uglify JS
// Use jslib above to rebuild third-party libraries.

gulp.task('js', function() {
  return gulp.src([
      src.js
    ])
    .pipe(sourcemaps.init())
    //.pipe(concat('bundle.js'))
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(dist.js))
    .pipe(gulp.dest(assets.js))
    .pipe(browserSync.reload({stream: true}))
    .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); });
});


// Uglify reporting

var pump = require('pump');

gulp.task('uglify-error-debugging', function (cb) {
  pump([
    gulp.src(src.js),
    uglify(),
    gulp.dest(dist.js)
  ], cb);
});

gulp.task('watch', function() {
  gulp.watch('_sass/**/*.scss', ['sass']);
  gulp.watch(['*.html', '_layouts/*.html', '_includes/*.html', '_posts/*.md',  'pages_/*.md', '_include/*html','data/*'], ['rebuild']);
  gulp.watch('_js/**/*.js', ['js']);
});

gulp.task('default', ['browser-sync', 'watch']);

// Minify HTML
gulp.task('html', function() {
    gulp.src('./_site/index.html')
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('./_site'))
    gulp.src('./_site/*/*html')
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('./_site/./'))
});

// Images

gulp.task('img',function(){
  return gulp.src([
      src.img
    ])
    .pipe(gulp.dest(dist.img))
    .pipe(gulp.dest(assets.img))
    .pipe(browserSync.reload({stream: true}))
    .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); });
});

gulp.task('img-posts', function() {
  return gulp.src('_img/posts/*.{png,jpg}')
    .pipe($.responsive({
      // For all the images in the folder
      '*': [{
        width: 230,
        rename: {suffix: '_placehold'},
      }, {
        // thubmnail
        width: 535,
        rename: { suffix: '_thumb' },
      }, {
        // thumbnail @2x
        width: 535 * 2,
        rename: { suffix: '_thumb@2x' },
      }, {
        width: 575,
        rename: { suffix: '_xs'}
      }, {
        width: 767,
        rename: {suffix: '_sm'}
      }, {
        width: 991,
        rename: { suffix: '_md' }
      }, {
        width: 1999,
        rename: { suffix: '_lg' }
      }, {
        // max-width hero
        width: 1920,
      }],
    }, {
      quality: 70,
      progressive: true,
      withMetadata: false,
    }))
    .pipe(imagemin())
    .pipe(gulp.dest('_site/assets/img/posts/'));
});

//Data
gulp.task('data', function() {
  return gulp.src(src.data)
    .pipe(gulp.dest(dist.data))
    .pipe(browserSync.reload({ stream: true }))
});