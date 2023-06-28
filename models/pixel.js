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

PixelSchema.methods.toInfo = function(includePos = false) {
    return {
        point: includePos ? {x: this.xPos, y: this.yPos} : undefined,
        modified: this.lastModified,
        colour: this.getHexColour(),
        editorID: this.editorID || undefined
    };
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
