const fs = require("fs");
const path = require("path");
const TOSManager = require("./TOSManager");
const pug = require("pug");

class ResponseFactory {
    constructor(app, root = "") {
        this.app = app;
        this.root = root;
    }

    renderTemplate(template, data = null, simulatedPath = null) {
        var sendData = this.getAutomaticTemplateData(simulatedPath);
        if (data) sendData = Object.assign({}, sendData, data);
        return pug.renderFile(path.join(this.root, template) + ".pug", sendData);
    }

    getAutomaticTemplateData(simulatedPath) {
        var data = { path: simulatedPath, config: this.app.config, fs, TOSManager };
        return data;
    }
}

ResponseFactory.prototype = Object.create(ResponseFactory.prototype);

module.exports = ResponseFactory;