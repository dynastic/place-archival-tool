let errors = 0;

const topicColour = "\x1b[34m"; // blue
const resetColour = "\x1b[0m";
const methodColours = {
    log: "\x1b[35m", // magenta
    info: "\x1b[32m", // green
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m" // red
}

for (const method of Object.keys(console)) {
    exports[method] = function log(topic, ...args) {
        var now = new Date();
        console[method](now.toLocaleDateString(), now.toLocaleTimeString(), `${topicColour}[${topic.toUpperCase()}]`, `${methodColours[method] || ""}${method.toUpperCase()}:${resetColour}`, ...args);
    };
}

// Error handling

exports.capture = (error, extra = null) => {
    errors++;
    exports.error('ERROR', error, extra);
}