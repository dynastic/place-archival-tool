const mongoose = require("mongoose");
mongoose.promise = global.Promise;
const PaintingManager = require("./util/PaintingManager");
const HTTPServer = require("./util/HTTPServer");
const ResponseFactory = require("./util/ResponseFactory");
const ModuleManager = require("./util/ModuleManager");
const JavaScriptProcessor = require("./util/JavaScriptProcessor");
const fs = require("fs");
const path = require("path");

var app = {};

app.logger = require('./util/logger');

app.config = require(path);
if(!app.config.siteName) app.config.siteName = "Place";
if(!app.config.boardSize) app.config.boardSize = 1600; // default to 1600 if not specified in config

app.responseFactory = (req, res) => new ResponseFactory(app, req, res);

app.reportError = app.logger.capture;

app.moduleManager = new ModuleManager(app);
app.moduleManager.loadAll();

// Create .place-data folder
app.dataFolder = path.resolve(__dirname, ".place-data");
if (!fs.existsSync(app.dataFolder)) fs.mkdirSync(app.dataFolder);

// Get image handler
app.paintingManager = PaintingManager(app);
app.logger.info('Startup', "Loading image from the database…");
app.paintingManager.loadImageFromDatabase().then((image) => {
    app.logger.info('Startup', "Successfully loaded image from database.");
}).catch((err) => {
    app.logger.capture("Error while loading the image from database: " + err);
});

app.httpServer = new HTTPServer(app);
app.server = app.httpServer.httpServer;

mongoose.connect(process.env.DATABASE || app.config.database);

// Process JS
app.javascriptProcessor = new JavaScriptProcessor(app);
app.javascriptProcessor.processJavaScript();

app.moduleManager.fireWhenLoaded((manager) => {
    function initializeServer(directories, routes = []) {
        app.httpServer.setupRoutes(directories, routes);
    }
    function continueWithServer(directories = []) {
        manager.getRoutesToRegister().then((routes) => initializeServer(directories, routes)).catch((err) => app.logger.capture(err))//initializeServer(directories));
    }
    manager.getAllPublicDirectoriesToRegister().then((directories) => continueWithServer(directories)).catch((err) => continueWithServer());
});
