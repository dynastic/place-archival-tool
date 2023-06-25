const express = require("express");
const BoardImageController = require("../controllers/BoardImageController");
const PixelInfoController = require("../controllers/PixelInfoController");

function APIRouter(app) {
    let router = express.Router();

    router.use(function(req, res, next) {
        res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
        res.header("Expires", "-1");
        res.header("Pragma", "no-cache");
        next();
    })

    // Normal APIs

    router.get("/board-image", BoardImageController.getAPIBoardImage);

    router.get("/pos-info", PixelInfoController.getAPIPixelInfo);

    return router;
}

APIRouter.prototype = Object.create(APIRouter.prototype);

module.exports = APIRouter;
