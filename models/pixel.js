const DataModelManager = require("../util/DataModelManager");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var colourPieceValidator = function(c) {
    return Number.isInteger(c) && c >= 0 && c <= 255;
}

var PixelSchema = new Schema({
    xPos: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value"
        }
    },
    yPos: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value"
        }
    },
    editorID: {
        type: Schema.ObjectId,
        required: false
    },
    lastModified: {
        type: Date,
        required: true
    },
    colourR: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: "{VALUE} is not a valid colour"
        }
    },
    colourG: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: "{VALUE} is not a valid colour"
        }
    },
    colourB: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: "{VALUE} is not a valid colour"
        }
    }
});

PixelSchema.methods.toInfo = function(userIDs = true) {
    var info = {
        point: {
            x: this.xPos,
            y: this.yPos
        },
        modified: this.lastModified,
        colour: this.getHexColour()
    };
    if (userIDs) info.editorID = this.editorID;
    return info;
}

PixelSchema.methods.getInfo = function(overrideDataAccess = false, app = null) {
    return new Promise((resolve, reject) => {
        let info = this.toInfo();
        require("./user").getPubliclyAvailableUserInfo(this.editorID, overrideDataAccess, app).then((userInfo) => resolve(Object.assign(info, userInfo))).catch((err) => reject(err));
    });
}

PixelSchema.methods.getSocketInfo = function() {
    return {x: this.xPos, y: this.yPos, colour: this.getHexColour()};
}

PixelSchema.methods.getHexColour = function() {
    return PixelSchema.statics.getHexFromRGB(this.colourR, this.colourG, this.colourB);
}

PixelSchema.statics.getHexFromRGB = function(r, g, b) {
    // Borrowed partly from: https://stackoverflow.com/a/5624139
    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
    return componentToHex(r) + componentToHex(g) + componentToHex(b);
}

PixelSchema.index({xPos: 1, yPos: 1});
module.exports = DataModelManager.registerModel("Pixel", PixelSchema);
