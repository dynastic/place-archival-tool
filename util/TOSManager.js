const path = require("path");
const fs = require("fs");

const configPath = path.join(__dirname, "..", "config");
const tosPath = path.join(configPath, "tos.md");
const ppPath = path.join(configPath, "privacy_policy.md");

class TOSManager {
    // Terms of Service

    hasTOSSync() {
        return fs.existsSync(tosPath);
    }
    
    hasTOS() {
        return new Promise((resolve, reject) => {
            fs.access(tosPath, (err) =>  resolve(err == null));
        });
    }
    
    getTOSContent() {
        return new Promise((resolve, reject) => {
            fs.readFile(tosPath, "utf8", (err, data) => {
                if(err || !data) return reject(err);
                resolve(data);
            });
        });
    }

    // Privacy Policy

    hasPrivacyPolicySync() {
        return fs.existsSync(ppPath);
    }

    hasPrivacyPolicy() {
        return new Promise((resolve, reject) => {
            fs.access(ppPath, (err) =>  resolve(err == null));
        });
    }
    
    getPrivacyPolicyContent() {
        return new Promise((resolve, reject) => {
            fs.readFile(ppPath, "utf8", (err, data) => {
                if(err || !data) return reject(err);
                resolve(data);
            });
        });
    }

}

const instance = new TOSManager();

module.exports = instance;