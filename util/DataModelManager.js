const mongoose = require("mongoose");

class DataModelManager {
    constructor() {
        this.registeredModels = new Map();
        this.modelStaticMethods = {};
        this.modelInstanceMethods = {};
        this.modelFields = {};
    }

    registerModel(name, prototype) {
        var m = this;
        // Check if we've already initialized this model
        var needsInitialization = !this.registeredModels.has(name);
        if(needsInitialization) {
            // Add original model static methods to our manager for later, and change them in the model to call the manager.
            Object.keys(prototype.statics).forEach((key) => {
                var method = prototype.statics[key];
                this._registerMethodHandler(name, key, true, method);
                prototype.statics[key] = function() {
                    return m._getMethodHandler(name, key, true).apply(this, Array.from(arguments))
                }
            });
            prototype.options.strict = false;
        }
        if(this.modelFields[name]) prototype.add(this.modelFields[name]);
        var model = mongoose.model(name, this.registeredModels.get(name) || prototype);
        if(needsInitialization) {
            // Add original model instance methods to our manager for later, and change them in the model to call the manager.
            Object.keys(prototype.methods).forEach((key) => {
                var method = mongoose.models[name].prototype[key];
                this._registerMethodHandler(name, key, false, method);
                this._setupMethodHandler(name, key, false);
            });
            // Add methods that we've declared in modules to the model.
            var methodsToAdd = this.modelInstanceMethods[name];
            if(methodsToAdd) Object.keys(methodsToAdd).forEach((key) => {
                this._setupMethodHandler(name, key, false);
            });
        }
        return model;
    }

    _setupMethodHandler(name, key, isStatic) {
        if (isStatic) return;
        let m = this;
        if(!mongoose.models[name]) return;
        mongoose.models[name].prototype[key] = function() {
            return m._getMethodHandler(name, key, false).apply(this, Array.from(arguments));
        }
    }

    _getList(isStatic) {
        return isStatic ? this.modelStaticMethods : this.modelInstanceMethods;
    }

    _getMethodHandler(model, name, isStatic) {
        var res = this._getList(isStatic)[model][name].slice();
        if (res.length <= 1) return res[0];
        res.reverse();
        return function() {
            var args = Array.from(arguments);
            var index = 1;
            args.push(() => {
                if(!res[index]) return;
                index++;
                return res[index - 1].apply(this, args);
            });
            return res[0].apply(this, args);
        }
    }

    _registerMethodHandler(model, name, isStatic, handler) {
        if(!this._getList(isStatic)[model]) this._getList(isStatic)[model] = [];
        if(!this._getList(isStatic)[model][name]) this._getList(isStatic)[model][name] = [];
        this._getList(isStatic)[model][name].push(handler);
    }
}

const instance = new DataModelManager();
Object.freeze(instance);

module.exports = instance;
