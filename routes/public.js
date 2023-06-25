const express = require("express");

const GuidelineController = require("../controllers/GuidelineController");
const TOSController = require("../controllers/TOSController");
const AccountPageController = require("../controllers/AccountPageController");

function PublicRouter(app) {
    let router = express.Router();

    router.get("/", function(req, res) {
        req.responseFactory.sendRenderedResponse("public/index");
    });

    router.get(["/guidelines", "/rules", "/community-guidelines"], GuidelineController.getGuidelines);
    router.get(["/tos", "/terms-of-service"], TOSController.getTOS);
    router.get(["/privacy", "/privacy-policy"], TOSController.getPrivacyPolicy);

    router.get("/sitemap.xml", function(req, res, next) {
        if (typeof app.config.host === undefined) return next();
        req.responseFactory.sendRenderedResponse("public/sitemap.xml.pug", null, "text/xml");
    });

    router.get("/@:username", AccountPageController.getAccount);

    return router;
}

PublicRouter.prototype = Object.create(PublicRouter.prototype);

module.exports = PublicRouter;
