const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const helmet = require("helmet");

function HTTPServer(app) {
    var server = express();
    var httpServer = require("http").createServer(server);
    
    // Setup for parameters and bodies
    server.use(bodyParser.urlencoded({extended: false}));
    server.use(bodyParser.json());
    
    server.use(helmet());

    // Set rendering engine
    server.set("view engine", "pug");

    var setupRoutes = function(directories, modulesWithRoutes) {
        // Use public folder for resources
        server.use(express.static("public"));
        // Register module public directories
        directories.forEach((dir) => server.use(dir.root, dir.middleware));
        
        // Log to console
        // Log requests to console
        server.use(morgan("dev"));

        // Pretty-print JSON
        server.set("json spaces", 4);

        server.set("trust proxy", typeof app.config.trustProxyDepth === "number" ? app.config.trustProxyDepth : 0);

        server.use((req, res, next) => {
            req.place = app;
            req.responseFactory = app.responseFactory(req, res);
            next();
        })

        server.use((req, res, next) => app.moduleManager.processRequest(req, res, next));

        modulesWithRoutes.forEach((moduleRoutes) => {
            moduleRoutes.forEach((route) => server.use(route.root, route.middleware));
        });

        // Handle routes
        server.use("/api", require("../routes/api")(app));
        server.use("/", require("../routes/public")(app));
    }

    return {
        server: server,
        httpServer: httpServer,
        setupRoutes: setupRoutes
    };
}

HTTPServer.prototype = Object.create(HTTPServer.prototype);

module.exports = HTTPServer;
