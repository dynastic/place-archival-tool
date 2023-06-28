const mongoose = require("mongoose");
mongoose.promise = global.Promise;
const PaintingManager = require("./util/PaintingManager");
const ResponseFactory = require("./util/ResponseFactory");
const JavaScriptProcessor = require("./util/JavaScriptProcessor");
const StaticGenerator = require("./util/StaticGenerator");
const User = require("./models/user");
const Pixel = require("./models/pixel");
const path = require("path");

const desiredPixelDataFileMax = 6700;

var app = {};

if (process.argv.length < 3) {
    console.error("Usage: npm run generate <instance config directory>")
    console.error("See documentation for more information.")
    process.exit(1);
}

const configDir = path.resolve(process.argv[2]);

app.logger = require('./util/logger');
app.configDirectory = configDir; 
app.config = require(path.join(configDir, "config.js"));

if(!app.config.siteName) app.config.siteName = "Place";
if(!app.config.boardSize) app.config.boardSize = 1600; // default to 1600 if not specified in config

app.responseFactory = new ResponseFactory(app, path.join(__dirname, "views"));

// Get image handler
app.paintingManager = PaintingManager(app);

mongoose.connect(process.env.DATABASE || app.config.database);

(async () => {
    const outDirectory = path.resolve(__dirname, "out");
    const generator = new StaticGenerator(app, outDirectory);
    app.logger.info('Generation', "Created output directory.")

    const pixelCount = await Pixel.count();
    app.logger.info('Generation', "Found", pixelCount.toLocaleString(), "pixels in database. Splitting into under", desiredPixelDataFileMax.toLocaleString(), "files…");
    const axisSegments = Math.floor(Math.sqrt(desiredPixelDataFileMax));
    const axisSegmentSize = Math.ceil(app.config.boardSize / axisSegments);

    // Create two-dimensional array of segments
    const segments = [];
    for (let i = 0; i < axisSegments; i++) {
        segments[i] = [];
        for (let j = 0; j < axisSegments; j++) {
            segments[i][j] = { pixels: {}, users: {} };
        }
    }

    const segmentForPixel = (pixel) => {
        return {
            segmentX: Math.floor(pixel.xPos / axisSegmentSize),
            segmentY: Math.floor(pixel.yPos / axisSegmentSize),
            pixelKey: `${pixel.xPos}.${pixel.yPos}`
        };
    }

    app.logger.info('Generation', "Writing common files…")
    generator.writeCommonFiles(axisSegmentSize);

    app.logger.info('Generation', "Building and processing client JavaScript…");
    await new JavaScriptProcessor(app).processJavaScript(path.join(outDirectory, "js", "build"));

    // Maintain a list of users for pixel JSON later
    const userData = {};
    app.logger.info('Generation', "Loading users from database…");

    // Load users into memory
    await User.find({ banned: { $ne: true }, deactivated: { $ne: true }, deletionDate: { $exists: false } }).cursor().eachAsync(async (user) => {
        userData[user.id] = user.toInfo(app);
    })
    app.logger.info('Generation', "Loaded all users from database");

    app.logger.info('Generation', "Loading pixels from the database…");
    var latestPixelForUser = {};
    // Load pixels from database
    await app.paintingManager.loadImageFromDatabase((pixel) => {
        const { pixelKey, segmentX, segmentY } = segmentForPixel(pixel);
        segments[segmentX][segmentY].pixels[pixelKey] = pixel.toInfo();
        if (pixel.editorID) {
            if (!latestPixelForUser[pixel.editorID] || latestPixelForUser[pixel.editorID].lastModified < pixel.lastModified) latestPixelForUser[pixel.editorID] = pixel.toInfo(true);
            if (userData[pixel.editorID]) segments[segmentX][segmentY].users[pixel.editorID] = userData[pixel.editorID];
        }
    });
    
    // Now that we know the latest pixel for each user, add them to the segments
    for (let x = 0; x < axisSegments; x++) {
        for (let y = 0; y < axisSegments; y++) {
            for (let userID in segments[x][y].users) {
                segments[x][y].users[userID].latestPixel = latestPixelForUser[userID];
            }
        }
    }

    // Write profile pages for each user
    app.logger.info('Generation', "Writing profile pages to disk…");
    for (let userID in userData) {
        generator.writeProfilePage(userData[userID]);
    }

    // Write out segments
    app.logger.info('Generation', "Writing pixel data to disk…");
    for (let x = 0; x < axisSegments; x++) {
        for (let y = 0; y < axisSegments; y++) {
            generator.writePixelSegmentInfo(segments[x][y], x, y);
        }
    }

    // Start writing image
    app.logger.info('Generation', "Generating image and saving to disk…");
    const { image } = await app.paintingManager.getOutputImage();
    generator.writeBoardImage(image);
    app.logger.info('Generation', "Successfully wrote pixel data to disk.");

    app.logger.info('Generation', "Done! Your static site is now available in", outDirectory);
    process.exit();
})();
