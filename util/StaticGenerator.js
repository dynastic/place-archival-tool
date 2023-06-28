const fs = require("fs");
const path = require("path");
const TOSManager = require("./TOSManager");
const { marked } = require("marked");

class StaticGenerator {
    constructor(app, outputFolder) {
        this.app = app;
        this.outputFolder = outputFolder;
        this.dataOutputFolder = path.join(outputFolder, "data")
        this.pixelsOutputFolder = path.join(this.dataOutputFolder, "pixels")

        this._createDirectory();
    }

    _createDirectory() {
        if (fs.existsSync(this.outputFolder)) fs.rmSync(this.outputFolder, { recursive: true, force: true });
        fs.mkdirSync(this.outputFolder);
        fs.mkdirSync(this.dataOutputFolder);
        fs.mkdirSync(this.pixelsOutputFolder);
    }

    _renderAndWriteTemplate(outputFilename, templateName, data = {}, simulatedPath = null) {
        fs.writeFileSync(path.join(this.outputFolder, outputFilename), this.app.responseFactory.renderTemplate(templateName, data, simulatedPath));
    }
    
    // Write the files common to every build to /out
    async writeCommonFiles(axisSegmentSize)  {
        // Write homepage to /index.html
        this._renderAndWriteTemplate("index.html", "public/index", { axisSegmentSize }, "/");
        // Write 404 page to /404.html
        this._renderAndWriteTemplate("404.html", "errors/404", {});

        // Write community guidelines page
        const guidelinesFile = path.join(this.app.configDirectory, "community_guidelines.md");
        if (fs.existsSync(guidelinesFile)) {
            const data = fs.readFileSync(guidelinesFile, "utf8");
            const markdown = marked(data, { async: false });
            ["guidelines.html", "rules.html", "community-guidelines.html"].forEach(filename => {
                this._renderAndWriteTemplate(filename, "public/markdown-document", {
                    pageTitle: "Community Guidelines",
                    pageDesc: `The set of rules you must abide by to participate in ${this.app.config.siteName}.`,
                    md: markdown
                });
            });
        }

        // Write TOS and privacy policy pages
        if (TOSManager.hasTOSSync()) {
            const data = await TOSManager.getTOSContent();
            const markdown = marked(data, { async: false });
            ["tos.html", "terms-of-service.html"].forEach(filename => {
                this._renderAndWriteTemplate(filename, "public/markdown-document", {
                    pageTitle: "Terms of Service",
                    pageDesc: `The terms of service that agreement to is required in order to participate in ${this.app.config.siteName}.`,
                    md: markdown
                });
            });
        }
        if (TOSManager.hasPrivacyPolicySync()) {
            const data = await TOSManager.getPrivacyPolicyContent();
            const markdown = marked(data, { async: false });
            ["privacy.html", "privacy-policy.html"].forEach(filename => {
                this._renderAndWriteTemplate(filename, "public/markdown-document", {
                    pageTitle: "Privacy Policy",
                    pageDesc: `How your data is processed by ${this.app.config.siteName}.`,
                    md: markdown
                });
            });
        }

        // Write a sitemap if we know the host from config
        if (this.app.config.host) this._renderAndWriteTemplate("sitemap.xml", "public/sitemap.xml")

        // Copy the public folder to the output folder
        fs.cpSync(path.join(__dirname, "..", "public"), this.outputFolder, { recursive: true });
    }

    writeProfilePage(profileUserInfo) {
        this._renderAndWriteTemplate(`@${profileUserInfo.username}.html`, "public/account", { profileUserInfo });
    }

    writePixelSegmentInfo(info, x, y) {
        fs.writeFileSync(path.join(this.pixelsOutputFolder, `${x}.${y}.json`), JSON.stringify(info));
    }

    writeBoardImage(img) {
        fs.writeFileSync(path.join(this.dataOutputFolder, "board-image.png"), img);
    }
}

module.exports = StaticGenerator;