const DataModelManager = require("../util/DataModelManager");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Pixel = require("./pixel");

var UserSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    creationDate: {
        type: Date,
        required: true
    },
    lastPlace: {
        type: Date,
        required: false
    },
    isOauth: {
        type: Boolean,
        required: false
    },
    passwordResetKey: {
        type: String,
        required: false
    },
    usernameSet: {
        type: Boolean,
        required: true,
        default: true
    },
    OAuthID: {
        type: String,
        required: false
    },
    OAuthName: {
        type: String,
        required: false
    },
    admin: {
        type: Boolean,
        required: true,
        default: false
    },
    moderator: {
        type: Boolean,
        required: true,
        default: false
    },
    tester: {
        type: Boolean,
        required: false,
        default: false
    },
    placeCount: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not a valid integer"
        },
        default: 0
    },
    banned: {
        type: Boolean,
        required: true,
        default: false
    },
    deactivated: {
        type: Boolean,
        required: true,
        default: false
    },
    userNotes: {
        type: String,
        required: false,
        default: ""
    },
    lastAcceptedTOSRevision: {
        type: String,
        required: false
    },
    totpSecret: {
        type: String,
        required: false
    },
    latestChangelogFetch: {
        type: String,
        required: false
    },
    changelogOptedOut: {
        type: Boolean,
        required: false,
        default: false
    },
    deletionDate: {
        type: Date,
        required: false
    }
});

UserSchema.methods.toInfo = function(app = null) {
    var info = {
        id: this.id,
        username: this.name,
        creationDate: this.creationDate,
        admin: this.admin,
        moderator: this.moderator,
        statistics: {
            totalPlaces: this.placeCount,
            lastPlace: this.lastPlace
        },
        initials: this.getUsernameInitials(),
        badges: this.getBadges(app)
    };
    if (typeof info.statistics.placesThisWeek === "undefined") info.statistics.placesThisWeek = null;
    if (typeof info.statistics.leaderboardRank === "undefined") info.statistics.leaderboardRank = null;
    return info;
}

UserSchema.methods.isMarkedForDeletion = function() {
    return this.deletionDate != null
}

UserSchema.statics.findByUsername = function(username, callback = null) {
    return this.findOne({
        name: {
            $regex: new RegExp(["^", username.toLowerCase(), "$"].join(""), "i")
        }
    }, callback)
}

UserSchema.methods.getUsernameInitials = function() {
    function getInitials(string) {
        var output = "";
        var mustBeUppercase = false;
        var lastCharacterUsed = false;
        for (var i = 0; i < string.length; i++) {
            // Limit to three characters
            if (output.length >= 3) break;
            // Check if this character is uppercase, and add to string if so
            if ((string[i].toUpperCase() == string[i] || !mustBeUppercase) && string[i].match(mustBeUppercase ? /[a-z]/i : /[a-z0-9]/i)) {
                // Don't allow subsequent matches
                if (!lastCharacterUsed) output += string[i].toUpperCase();
                lastCharacterUsed = true;
            } else {
                lastCharacterUsed = false;
            }
            mustBeUppercase = true;
            // Check if this character is a separator, and skip needing to be uppercase if so
            if ([",", " ", "_", "-"].indexOf(string[i]) > -1) mustBeUppercase = false;
        }
        return output;
    }
    return getInitials(this.name);
}

UserSchema.statics.getPubliclyAvailableUserInfo = function(userID, overrideDataAccess = false, app = null, getPixelInfo = true) {
    return new Promise((resolve, reject) => {
        var info = {};
        function returnInfo(error) {
            info.userError = error;
            resolve(info);
        }
        var continueWithUser = (user) => {
            if (!user) return returnInfo("delete");
            if (!overrideDataAccess && user.banned) return returnInfo("ban");
            else if (!overrideDataAccess && user.isMarkedForDeletion()) return returnInfo("deleted");
            else if (!overrideDataAccess && user.deactivated) return returnInfo("deactivated");
            user.getInfo(app, getPixelInfo).then((userInfo) => {
                info.user = userInfo;
                if(overrideDataAccess) {
                    info.user.isOauth = user.isOauth;
                    info.user.hasTOTP = user.twoFactorAuthEnabled();
                }
                resolve(info);
            }).catch((err) => returnInfo("delete"));
        }
        if(!userID) return continueWithUser(null);
        this.findById(userID).then(continueWithUser).catch((err) => {
            app.logger.capture("Error getting user info: " + err, { user: { _id: userID } });
            returnInfo("delete");
        });
    });
}

UserSchema.methods.getBadges = function(app) {
    var badges = [];
    if(this.banned) badges.push({ text: "Banned", style: "danger", title: "This user has been banned for breaking the rules." });
    else if(this.isMarkedForDeletion()) badges.push({ text: "Deleted", style: "danger", title: "This user chose to delete their account." });
    else if(this.deactivated) badges.push({ text: "Deactivated", style: "danger", title: "This user chose to deactivate their account." });
    if(this.admin) badges.push({ text: "Admin", style: "warning", inlineBefore: true, title: "This user is an administrator." });
    else if(this.moderator) badges.push({ text: "Moderator", shortText: "Mod", style: "warning", inlineBefore: true, title: "This user is a moderator." });
    return badges;
}

module.exports = DataModelManager.registerModel("User", UserSchema);
