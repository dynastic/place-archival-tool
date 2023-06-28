const Jimp = require("jimp");
const Pixel = require("../models/pixel");

function PaintingManager(app) {
    const imageSize = app.config.boardSize;
    return {
        hasImage: false,
        imageHasChanged: false,
        image: null,
        outputImage: null,
        waitingForImages: [],
        firstGenerateAfterLoad: false,
        isGenerating: false,

        createNewImage: function() {
            return new Jimp(imageSize, imageSize, 0xFFFFFFFF);
        },

        loadImageFromDatabase: async function(pixelCallback) {
            const image = this.createNewImage()
            return new Promise((resolve, reject) => {
                Pixel.count({}).then((count) => {
                    var loaded = 0;
                    var progressUpdater = setInterval(() => {
                        app.logger.info("Startup", `Loaded ${loaded.toLocaleString()} of ${count.toLocaleString()} pixel${count == 1 ? "" : "s"} (${Math.round(loaded / count * 100)}% complete)`);
                    }, 2500);
                    Pixel.find({}).cursor().on("data", (pixel) => {
                        const x = pixel.xPos, y = pixel.yPos;
                        const hex = Jimp.cssColorToHex(pixel.getHexColour());
                        pixelCallback(pixel);
                        if (x >= 0 && y >= 0 && x < imageSize && y < imageSize) image.setPixelColor(hex, x, y);
                        loaded++;
                    }).on("end", () => {
                        clearInterval(progressUpdater);
                        app.logger.info("Startup", `Loaded total ${count.toLocaleString()} pixel${count == 1 ? "" : "s"} pixels from database. Applying to image...`);
                        this.hasImage = true;
                        this.image = image;
                        this.generateOutputImage();
                        resolve(image);
                    }).on("error", (err) => {
                        clearInterval(progressUpdater);
                        reject(err)
                    });
                });
            });
        },

        getOutputImage: function() {
            return new Promise((resolve, reject) => {
                if (this.outputImage) return resolve({image: this.outputImage, hasChanged: this.imageHasChanged, generated: this.lastPixelUpdate});
                this.waitingForImages.push((err, buffer) => {
                    this.getOutputImage().then((data) => resolve(data)).catch((err) => reject(err));
                })
            })
        },

        generateOutputImage: function() {
            var a = this;
            return new Promise((resolve, reject) => {
                if (a.isGenerating) return reject();
                a.isGenerating = true;
                this.waitingForImages.push((err, buffer) => {
                    if (err) return reject(err);
                    resolve(buffer);
                })
                if(this.waitingForImages.length == 1) {
                    this.image.getBufferAsync(Jimp.MIME_PNG).then((buffer) => {
                        a.outputImage = buffer;
                        a.waitingForImages.forEach((callback) => callback(null, buffer));
                        a.waitingForImages = [];
                    }).catch((err) => {
                        app.logger.error("Could not generate output image:", err);
                        a.waitingForImages.forEach((callback) => callback(err, null));
                        a.waitingForImages = [];
                    }).then(() => {
                        a.isGenerating = false;
                        a.imageHasChanged = false;
                    });
                }
            })
        },

        getColourRGB: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
    };
}

PaintingManager.prototype = Object.create(PaintingManager.prototype);

module.exports = PaintingManager;
