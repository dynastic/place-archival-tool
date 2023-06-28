const gulp = require("gulp");
const uglify = require("gulp-uglify");
const babel = require("gulp-babel");

class JavaScriptProcessor {
    constructor(app) {
        this.app = app;
    }

    processJavaScript(dest) {
        return new Promise((resolve, reject) => {
            gulp.src("client/js/*.js")
                .pipe(babel({ presets: ["@babel/preset-env"] }))
                .on("error", (err) => reject(err))
                .pipe(uglify())
                .on("error", (err) => reject(err))
                .pipe(gulp.dest(dest))
                .on("error", (err) => reject(err))
                .on("end", () => {
                    this.app.logger.info('Babel', "Finished processing JavaScript.");
                    resolve();
                });
        })
    }
}

JavaScriptProcessor.prototype = Object.create(JavaScriptProcessor.prototype);

module.exports = JavaScriptProcessor;