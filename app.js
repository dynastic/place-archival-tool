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

app.loadConfig = (path = "./config/config") => {
    delete require.cache[require.resolve(path)];
    var oldConfig = app.config;
    app.config = require(path);
    if(!app.config.siteName) app.config.siteName = "Place";
    if(!app.config.boardSize) app.config.boardSize = 1600; // default to 1600 if not specified in config
    if(oldConfig && (oldConfig.secret != app.config.secret || oldConfig.database != app.config.database || oldConfig.boardSize != app.config.boardSize)) {
        app.logger.log("Configuration", "We are stopping the Place server because the database URL, secret, and/or board image size has been changed, which will require restarting the entire server.");
        process.exit(0);
    }
    if(oldConfig && (oldConfig.oauth != app.config.oauth)) {
        app.stopServer();
        app.recreateServer();
        app.restartServer();
        app.recreateRoutes();
    }
    if(oldConfig && (oldConfig.port != app.config.port || oldConfig.onlyListenLocal != app.config.onlyListenLocal)) app.restartServer();
}
app.loadConfig();

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
    app.paintingManager.startTimer();
    app.logger.info('Startup', "Successfully loaded image from database.");
}).catch((err) => {
    app.logger.capture("Error while loading the image from database: " + err);
});

app.recreateServer = () => {
    app.httpServer = new HTTPServer(app);
    app.server = app.httpServer.httpServer;
}
app.recreateServer();

mongoose.connect(process.env.DATABASE || app.config.database);

// Process JS
app.javascriptProcessor = new JavaScriptProcessor(app);
app.javascriptProcessor.processJavaScript();

app.stopServer = () => {
    if(app.server.listening) {
        app.logger.log('Shutdown', "Closing server…")
        app.server.close();
        setImmediate(function() { app.server.emit("close"); });
    }
}

app.restartServer = () => {
    app.stopServer();
    app.server.listen(process.env.PORT || app.config.port, (process.env.ONLY_LISTEN_LOCAL ? process.env.ONLY_LISTEN_LOCAL === true : app.config.onlyListenLocal) ? "127.0.0.1" : null, null, () => {
        app.logger.log('Startup', `Started Place server on port ${app.config.port}${app.config.onlyListenLocal ? " (only listening locally)" : ""}.`);
    });
}
app.restartServer();
app.recreateRoutes = () => {
    app.moduleManager.fireWhenLoaded((manager) => {
        function initializeServer(directories, routes = []) {
            app.httpServer.setupRoutes(directories, routes);
        }
        function continueWithServer(directories = []) {
            manager.getRoutesToRegister().then((routes) => initializeServer(directories, routes)).catch((err) => app.logger.capture(err))//initializeServer(directories));
        }
        manager.getAllPublicDirectoriesToRegister().then((directories) => continueWithServer(directories)).catch((err) => continueWithServer());
    });
}
app.recreateRoutes();

