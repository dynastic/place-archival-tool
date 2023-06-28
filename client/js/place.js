//
//  Place.js
//  -----------
//  Written by THE WHOLE DYNASTIC CREW. Inspired by Reddit's /r/place.
//

var size;
var canvasController = {
    isDisplayDirty: false,

    init: function(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        // Disable image smoothing
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        this.ctx.imageSmoothingEnabled = false;
    },

    clearCanvas: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isDisplayDirty = true;
    },

    drawImage: function(image) {
        this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
        this.isDisplayDirty = true;
    },

    drawImageData: function(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
        this.isDisplayDirty = true;
    },

    setPixel: function(colour, x, y) {
        this.ctx.fillStyle = colour;
        this.ctx.fillRect(x, y, 1, 1);
        this.isDisplayDirty = true;
    },

    getPixelColour: function(x, y) {
        var data = this.ctx.getImageData(x, y, 1, 1).data;
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return componentToHex(data[0]) + componentToHex(data[1]) + componentToHex(data[2]);
    }
};

var place = {
    zooming: {
        zoomedIn: false,
        panFromX: 0, panFromY: 0,
        panToX: null, panToY: null,
        zooming: false,
        zoomFrom: 0,
        zoomTo: 0,
        zoomTime: 0,
        zoomHandle: null,
        fastZoom: false,
        initialZoomPoint: 4,
        zoomedInPoint: 40,
        snapPoints: [0, 4, 40, 80],
        zoomScale: 4,
        wasZoomedFullyOut: false
    },
    keys: {
        left: [37, 65],
        up: [38, 87],
        right: [39, 68],
        down: [40, 83]
    },
    keyStates: {},
    zoomButton: null,
    dragStart: null,
    placing: false, shouldShowPopover: false,
    panX: 0, panY: 0,
    handElement: null, lastUpdatedCoordinates: {x: null, y: null}, loadedImage: false,
    hashHandler: hashHandler,
    cursorX: 0, cursorY: 0,

    start: function(canvas, zoomController, cameraController, displayCanvas, colourPaletteElement, coordinateElement, userCountElement, gridHint, pixelDataPopover, grid) {
        // Setup sizes
        size = canvas.height;
        $(cameraController).css({height: `${size}px`, width: `${size}px`});

        this.canvas = canvas; // moved around; hidden
        this.canvasController = canvasController;
        this.canvasController.init(canvas);
        this.grid = grid;
        this.displayCanvas = displayCanvas; // used for display

        this.originalTitle = document.title;

        this.coordinateElement = coordinateElement;
        this.gridHint = gridHint;
        this.pixelDataPopover = pixelDataPopover;

        var app = this;

        var controller = $(zoomController).parent()[0];
        canvas.onmousemove = (event) => this.handleMouseMove(event || window.event);
        canvas.addEventListener("contextmenu", (event) => this.contextMenu(event));

        var handleKeyEvents = function(e) {
            var kc = e.keyCode || e.which;
            app.keyStates[kc] = e.type == "keydown";
        }

        document.body.onkeyup = function(e) {
            if(document.activeElement.tagName.toLowerCase() != "input") handleKeyEvents(e);
        }
        document.body.onkeydown = function(e) {
            if(document.activeElement.tagName.toLowerCase() != "input" && $(".dialog-ctn.show").length <= 0) {
                handleKeyEvents(e);
                app.handleKeyDown(e.keyCode || e.which);
            }
        };
        document.body.onmousemove = function(e) {
            app.cursorX = e.pageX;
            app.cursorY = e.pageY;
        };

        window.onresize = () => this.handleResize();
        window.onhashchange = () => this.handleHashChange();
        $(window).on("wheel mousewheel", (e) => this.mousewheelMoved(e));

        this.zoomController = zoomController;
        this.cameraController = cameraController;
        this.setupDisplayCanvas(this.displayCanvas);
        this.setupInteraction();

        var spawnPoint = this.getSpawnPoint();
        this.setCanvasPosition(spawnPoint.x, spawnPoint.y);
        this.setupZoomSlider();
        this.setZoomScale(this.zooming.zoomScale);

        $(this.coordinateElement).show();

        this.getCanvasImage();

        // Check canvas size after chat animation
        $(".canvas-container").on('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd', () => {
            this.handleResize();
        });

        setInterval(function() { app.doKeys() }, 15);

        this.dismissBtn = $("<button>").attr("type", "button").addClass("close").attr("data-dismiss", "alert").attr("aria-label", "Close");
        $("<span>").attr("aria-hidden", "true").html("&times;").appendTo(this.dismissBtn);
    },

    handleColourTextChange: function(premature = false) {
        var colour = $("#colour-picker-hex-value").val();
        if(colour.substring(0, 1) != "#") colour = "#" + colour;
        if(colour.length != 7 && (colour.length != 4 || premature)) return;
        $("#colour-picker").minicolors("value", colour);
    },

    getCanvasImage: function() {
        if(this.loadedImage) return;
        var app = this;
        this.adjustLoadingScreen("Loading…");;
        this.loadImage().then((image) => {
            app.adjustLoadingScreen();
            app.canvasController.clearCanvas();
            app.canvasController.drawImage(image);
            app.updateDisplayCanvas();
            app.displayCtx.imageSmoothingEnabled = false;
            app.loadedImage = true;
        }).catch((err) => {
            console.error("Error loading board image", err);
            app.adjustLoadingScreen("An error occurred. Please wait…");
            setTimeout(function() {
                app.getCanvasImage()
            }, 5000);
        });
    },

    loadImage: function() {
        var a = this;
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "/data/board-image.png", true);
            xhr.responseType = "blob";
            xhr.onload = function(e) {
                if(xhr.status == 200) {
                    var url = URL.createObjectURL(this.response);
                    var img = new Image();
                    img.onload = function() {
                        URL.revokeObjectURL(this.src);
                        var lastImageUpdate = xhr.getResponseHeader("X-Place-Last-Update");
                        if(lastImageUpdate) a.requestPixelsAfterDate(lastImageUpdate);
                        resolve(img);
                    };
                    img.onerror = () => reject(xhr);
                    img.src = url;
                } else reject(xhr);
            };
            xhr.onerror = () => reject(xhr);
            xhr.send();
        });
    },

    setupInteraction: function() {
        var app = this;
        interact(this.cameraController).draggable({
            inertia: true,
            restrict: {
                restriction: "parent",
                elementRect: { top: 0.5, left: 0.5, bottom: 0.5, right: 0.5 },
                endOnly: true
            },
            autoScroll: true,
            onstart: (event) => {
                if(event.interaction.downEvent.button == 2) return event.preventDefault();
                $(app.zoomController).addClass("grabbing");
                $(":focus").blur();
            },
            onmove: (event) => {
                app.moveCamera(event.dx, event.dy);
            },
            onend: (event) => {
                if(event.interaction.downEvent.button == 2) return event.preventDefault();
                $(app.zoomController).removeClass("grabbing");
                var coord = app.getCoordinates();
                app.hashHandler.modifyHash(coord);
            }
        }).on("tap", (event) => {
            if(event.interaction.downEvent.button == 2) return event.preventDefault();
            if(!this.zooming.zooming) {
                var cursor = app.getCanvasCursorPosition(event.pageX, event.pageY);
                app.canvasClicked(cursor.x, cursor.y);
            }
            event.preventDefault();
        }).on("doubletap", (event) => {
            if(app.zooming.zoomedIn) {
                app.zoomFinished();
                app.shouldShowPopover = false;
                app.setZoomScale(this.zooming.initialZoomPoint, true);
                event.preventDefault();
            }
        });
    },

    mousewheelMoved: function(event) {
        if ($('.canvas-container:hover').length <= 0) return;
        var e = event.originalEvent;
        e.preventDefault();
        var delta = e.type == "wheel" ? -e.deltaY : (typeof e.wheelDeltaY !== "undefined" ? e.wheelDeltaY : e.wheelDelta);
        this.setZoomScale(this.zooming.zoomScale + (delta / 100));
    },

    getCanvasCursorPosition: function(x = null, y = null) {
        var zoom = this._getZoomMultiplier();
        return {x: Math.round(((x ? x : this.cursorX) - $(this.cameraController).offset().left) / zoom), y: Math.round(((y ? y : this.cursorY) - $(this.cameraController).offset().top) / zoom)};
    },

    getSpawnPoint: function() {
        var point = this.getHashPoint();
        if (point) return point;
        return this.getRandomSpawnPoint();
    },

    getHashPoint: function() {
        var hash = this.hashHandler.getHash();
        if(typeof hash.x !== "undefined" && typeof hash.y !== "undefined") {
            var x = parseInt(hash.x), y = parseInt(hash.y);
            var fixed = this.closestInsideCoordinates(x, y);
            if(x !== null && y !== null && !isNaN(x) && !isNaN(y)) return {x: -fixed.x + (size / 2), y: -fixed.y + (size / 2)};
        }
        return null;
    },

    handleHashChange: function() {
        var point = this.getHashPoint();
        if (point) this.setCanvasPosition(point.x, point.y);
    },

    getRandomSpawnPoint: function() {
        function getRandomTileNumber() {
            return Math.random() * size - (size / 2);
        }
        return {x: getRandomTileNumber(), y: getRandomTileNumber()};
    },

    handleResize: function() {
        var canvasContainer = $(this.zoomController).parent();
        this.displayCanvas.height = canvasContainer.height();
        this.displayCanvas.width = canvasContainer.width();
        this.displayCtx.mozImageSmoothingEnabled = false;
        this.displayCtx.webkitImageSmoothingEnabled = false;
        this.displayCtx.msImageSmoothingEnabled = false;
        this.displayCtx.imageSmoothingEnabled = false;
        this.updateDisplayCanvas();
        if(this.zooming.wasZoomedFullyOut) this.setZoomScale(0);
        this.updateGrid();
        this.updateGridHint(this.lastX, this.lastY);
    },

    setupDisplayCanvas: function(canvas) {
        this.displayCtx = canvas.getContext("2d");
        this.handleResize();
        this.updateDisplayCanvas();
    },

    updateDisplayCanvas: function() {
        var dcanvas = this.displayCanvas;
        this.displayCtx.clearRect(0, 0, dcanvas.width, dcanvas.height);
        var zoom = this._getCurrentZoom();
        var mod = size / 2;
        this.displayCtx.drawImage(this.canvas, dcanvas.width / 2 + (this.panX - mod - 0.5) * zoom, dcanvas.height / 2 + (this.panY - mod - 0.5) * zoom, this.canvas.width * zoom, this.canvas.height * zoom);
    },

    _lerp: function(from, to, time) {
        if (time > 100) time = 100;
        return from + (time / 100) * (to - from);
    },

    _getCurrentZoom: function() {
        if (!this.zooming.zooming) return this._getZoomMultiplier();
        return this._lerp(this.zooming.zoomFrom, this.zooming.zoomTo, this.zooming.zoomTime);
    },

    _getZoomMultiplier: function() {
        return this.zooming.zoomScale;
    },

    animateZoom: function(callback = null) {
        this.zooming.zoomTime += this.zooming.fastZoom ? 5 : 2;

        var x = this._lerp(this.zooming.panFromX, this.zooming.panToX, this.zooming.zoomTime);
        var y = this._lerp(this.zooming.panFromY, this.zooming.panToY, this.zooming.zoomTime);
        this.updateUIWithZoomScale(this._lerp(this.zooming.zoomFrom, this.zooming.zoomTo, this.zooming.zoomTime));
        this.setCanvasPosition(x, y);

        if (this.zooming.zoomTime >= 100) {
            this.zoomFinished();
            if(this.shouldShowPopover) {
                $(this.pixelDataPopover).fadeIn(250);
                this.shouldShowPopover = false;
            }
            if(callback) callback();
            return
        }
    },

    updateUIWithZoomScale: function(zoomScale = null) {
        if(zoomScale === null) zoomScale = this.zooming.zoomScale;
        $(this.zoomController).css("transform", `scale(${zoomScale})`);
        $("#zoom-slider").slider('setValue', zoomScale, true);
        $(this.handElement).css({width: `${zoomScale}px`, height: `${zoomScale}px`, borderRadius: `${zoomScale / 8}px`});
        $(this.gridHint).css({width: `${zoomScale}px`, height: `${zoomScale}px`});
        this.updateGridHint(this.lastX, this.lastY);
    },

    zoomFinished: function() {
        this.zooming.zoomScale = this.zooming.zoomTo;
        this.zooming.zooming = false;
        this.setCanvasPosition(this.zooming.panToX, this.zooming.panToY);
        this.zooming.panToX = null, this.zooming.panToY = null, this.zooming.zoomTo = null, this.zooming.zoomFrom = null;
        clearInterval(this.zooming.zoomHandle);
        var coord = this.getCoordinates();
        this.hashHandler.modifyHash(coord);
        this.zooming.zoomHandle = null;
        this.zooming.fastZoom = false;
    },

    setupZoomSlider: function() {
        var minScale = this.getMinimumScale();
        $('#zoom-slider').slider({
            ticks: this.zooming.snapPoints.map((p) => Math.max(p, minScale)),
            ticks_snap_bounds: 0.01,
            step: 0.01,
            min: minScale,
            max: this.zooming.snapPoints[this.zooming.snapPoints.length - 1],
            scale: 'logarithmic',
            value: this.zooming.zoomScale,
        }).on('change', (event) => {
            this.setZoomScale(event.value.newValue, false, false);
        });
    },

    setZoomScale: function(scale, animated = false, affectsSlider = true) {
        if(this.zooming.zoomHandle !== null) return;
        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;
        if(this.zooming.panToX == null) this.zooming.panToX = this.panX;
        if(this.zooming.panToY == null) this.zooming.panToY = this.panY;
        var newScale = this.normalizeZoomScale(scale);
        if(animated) {
            this.zooming.zoomTime = 0;
            this.zooming.zoomFrom = this._getCurrentZoom();
            this.zooming.zoomTo = newScale;
            this.zooming.zooming = true;
            this.zooming.zoomHandle = setInterval(this.animateZoom.bind(this), 1);
        } else {
            this.zooming.zoomScale = newScale;
            this.updateUIWithZoomScale(newScale);
        }
        this.zooming.zoomedIn = newScale >= (this.zooming.initialZoomPoint + this.zooming.zoomedInPoint) / 2;
        if(!this.zooming.zoomedIn) $(this.pixelDataPopover).hide();
        this.updateDisplayCanvas();
        this.updateGrid();
        this._adjustZoomButtonText();
    },

    getMinimumScale: function() {
        var canvasContainer = $(this.zoomController).parent();
        return Math.min(1, Math.min((canvasContainer.height() - $("#page-nav").height()) / size, canvasContainer.width() / size));
    },

    normalizeZoomScale: function(scale) {
        var minScale = this.getMinimumScale();
        var newScale = Math.min(this.zooming.snapPoints[this.zooming.snapPoints.length - 1], Math.max(minScale, Math.max(this.zooming.snapPoints[0], scale)));
        this.zooming.wasZoomedFullyOut = newScale <= minScale;
        return newScale;
    },

    toggleZoom: function() {
        if (this.zooming.zooming) return;
        var scale = this.zooming.zoomScale;
        if (scale < this.zooming.initialZoomPoint) this.setZoomScale(this.zooming.initialZoomPoint, true);
        else if (scale < (this.zooming.initialZoomPoint + this.zooming.zoomedInPoint) / 2) this.setZoomScale(this.zooming.zoomedInPoint, true);
        else if (scale <= this.zooming.zoomedInPoint) this.setZoomScale(this.zooming.initialZoomPoint, true);
        else this.setZoomScale(this.zooming.zoomedInPoint, true);
    },

    _adjustZoomButtonText: function() {
        if (this.zoomButton) $(this.zoomButton).html(`<i class="fa fa-fw fa-search-${this.zooming.zoomedIn ? "minus" : "plus"}"></i>`).attr("title", (this.zooming.zoomedIn ? "Zoom Out" : "Zoom In") + " (spacebar)");
    },

    _adjustGridButtonText: function() {
        var gridShown = $(this.grid).hasClass("show");
        if (this.gridButton) $(this.gridButton).html(`<i class="fa fa-fw fa-${gridShown ? "square" : "th"}"></i>`).attr("title", (gridShown ? "Hide Grid" : "Show Grid") + " (G)");
    },

    setZoomButton: function(btn) {
        this.zoomButton = btn;
        this._adjustZoomButtonText();
        $(btn).click(this.toggleZoom.bind(this));
    },

    setGridButton: function(btn) {
        this.gridButton = btn;
        this._adjustGridButtonText();
        $(btn).click(this.toggleGrid.bind(this));
    },

    setCoordinatesButton: function(btn) {
        if(Clipboard.isSupported()) {
            var app = this;
            var clipboard = new Clipboard(btn);
            $(btn).addClass("clickable").tooltip({
                title: "Copied to clipboard!",
                trigger: "manual",
            });
            clipboard.on("success", function(e) {
                $(btn).tooltip("show");
                setTimeout(function() {
                    $(btn).tooltip("hide");
                }, 2500);
            })
        }
    },

    moveCamera: function(deltaX, deltaY, softAllowBoundPush = true) {
        var cam = $(this.cameraController);
        var zoomModifier = this._getCurrentZoom();
        var coords = this.getCoordinates();
        var x = deltaX / zoomModifier, y = deltaY / zoomModifier;
        this.setCanvasPosition(x, y, true, softAllowBoundPush);
    },

    updateCoordinates: function() {
        var coord = this.getCoordinates();
        if(coord != this.lastUpdatedCoordinates) {
            var coordElem = $(this.coordinateElement);
            setTimeout(function() {
                var spans = coordElem.find("span");
                spans.first().text(coord.x.toLocaleString());
                spans.last().text(coord.y.toLocaleString());
                coordElem.attr("data-clipboard-text", `(${coord.x}, ${coord.y})`);
            }, 0);
        }
        this.lastUpdatedCoordinates = coord;
    },

    isOutsideOfBounds: function(precise = false) {
        var coord = this.getCoordinates();
        var x = coord.x < 0 || coord.x >= size, y = coord.y >= size || coord.y < 0
        return precise ? { x: x, y: y } : x || y;
    },

    getCoordinates: function() {
        var dcanvas = this.canvasController.canvas;
        return {x: Math.floor(-this.panX) + dcanvas.width / 2, y: Math.floor(-this.panY) + dcanvas.height / 2};
    },

    setCanvasPosition: function(x, y, delta = false, softAllowBoundPush = true) {
        $(this.pixelDataPopover).hide();
        if (delta) this.panX += x, this.panY += y;
        else this.panX = x, this.panY = y;
        if(!softAllowBoundPush) {
            this.panX = Math.max(-(size / 2) + 1, Math.min((size / 2), this.panX));
            this.panY = Math.max(-(size / 2) + 1, Math.min((size / 2), this.panY));
        }
        $(this.cameraController).css({
            top: `${this.panY}px`,
            left: `${this.panX}px`
        })
        this.updateGrid();
        if(this.lastX, this.lastY) this.updateGridHint(this.lastX, this.lastY);
        this.updateCoordinates();
        this.updateDisplayCanvas();
    },

    updateGrid: function() {
        var zoom = this._getCurrentZoom();
        var x = ($(this.cameraController).offset().left - (zoom / 2)) % zoom;
        var y = ($(this.cameraController).offset().top - (zoom / 2)) % zoom;
        $(this.grid).css({transform: `translate(${x}px, ${y}px)`, backgroundSize: `${zoom}px ${zoom}px`});
    },

    toggleGrid: function() {
        $(this.grid).toggleClass("show");
        this._adjustGridButtonText();
    },

    updateGridHint: function(x, y) {
        this.lastX = x;
        this.lastY = y;
        if(this.gridHint) {
            var zoom = this._getCurrentZoom();
            // Hover position in grid multiplied by zoom
            var x = Math.round((this.lastX - $(this.cameraController).offset().left) / zoom), y = Math.round((this.lastY - $(this.cameraController).offset().top) / zoom);
            var elem = $(this.gridHint);
            var posX = x + ($(this.cameraController).offset().left / zoom) - 0.5;
            var posY = y + ($(this.cameraController).offset().top / zoom) - 0.5;
            elem.css({
                left: posX * zoom,
                top: posY * zoom,
            });
        }
    },

    handleMouseMove: function(event) {
        if(!this.placing) {
            this.updateGridHint(event.pageX, event.pageY);
            if(this.handElement) {
                var elem = $(this.handElement);
                elem.css({
                    left: event.pageX - (elem.width() / 2),
                    top: event.pageY - (elem.height() / 2),
                });
            }
        }
    },

    closestInsideCoordinates: function(x, y) {
        return {
            x: Math.max(0, Math.min(x, size - 1)),
            y: Math.max(0, Math.min(y, size - 1))
        };
    },

    contextMenu: function(event) {
        event.preventDefault();
        this.setZoomScale(this.zooming.initialZoomPoint, true);
    },

    getPixel: function(x, y, callback) {
        return placeAjax.get(`/data/pixels/${x}.${y}.json`, "An error occurred while trying to retrieve data about that pixel.").then((data) => {
            callback(null, data);
        }).catch((err) => callback(err));
    },

    isSignedIn: function() {
        return $("body").hasClass("signed-in");
    },

    getSiteName: function() {
        return $("meta[name=place-site-name]").attr("content");
    },

    zoomIntoPoint: function(x, y, actuallyZoom = true) {
        this.zooming.panToX = -(x - size / 2);
        this.zooming.panToY = -(y - size / 2);

        this.zooming.panFromX = this.panX;
        this.zooming.panFromY = this.panY;

        this.setZoomScale(actuallyZoom && !this.zooming.zoomedIn ? 40 : this.zooming.zoomScale, true); // this is lazy as fuck but so am i
    },

    canvasClicked: function(x, y, event) {
        var app = this;
        function getUserInfoTableItem(title, value) {
            var ctn = $("<div>").addClass("field");
            $("<span>").addClass("title").text(title).appendTo(ctn);
            $(`<span>`).addClass("value").html(value).appendTo(ctn);
            return ctn;
        }
        function getUserInfoDateTableItem(title, date) {
            var ctn = getUserInfoTableItem(title, "");
            $("<time>").attr("datetime", date).attr("title", new Date(date).toLocaleString()).text($.timeago(date)).prependTo(ctn.find(".value"));
            return ctn;
        }

        $(this.pixelDataPopover).hide();

        // Don't even try if it's out of bounds
        if (x < 0 || y < 0 || x > this.canvas.width - 1 || y > this.canvas.height - 1) return;

        // Make the user zoom in before placing pixel
        var wasZoomedOut = !this.zooming.zoomedIn;
        if(wasZoomedOut) this.zoomIntoPoint(x, y);

        this.zoomIntoPoint(x, y);
        return this.getPixel(x, y, (err, data) => {
            if(err || !data.pixel) return;
            var popover = $(this.pixelDataPopover);
            if(this.zooming.zooming) this.shouldShowPopover = true;
            else popover.fadeIn(250);
            var hasUser = !!data.pixel.user;
            if(typeof data.pixel.userError === "undefined") data.pixel.userError = null;
            popover.find("#pixel-data-username").text(hasUser ? data.pixel.user.username : this.getUserStateText(data.pixel.userError));
            if(hasUser) popover.find("#pixel-data-username").removeClass("deleted-account");
            else popover.find("#pixel-data-username").addClass("deleted-account");
            popover.find("#pixel-data-time").text($.timeago(data.pixel.modified));
            popover.find("#pixel-data-time").attr("datetime", data.pixel.modified);
            popover.find("#pixel-data-time").attr("title", new Date(data.pixel.modified).toLocaleString());
            popover.find("#pixel-data-x").text(x.toLocaleString());
            popover.find("#pixel-data-y").text(y.toLocaleString());
            popover.find("#pixel-colour-code").text(`#${data.pixel.colour.toUpperCase()}`);
            popover.find("#pixel-colour-preview").css("background-color", `#${data.pixel.colour}`);
            if(data.pixel.colour.toLowerCase() == "ffffff") popover.find("#pixel-colour-preview").addClass("is-white");
            else popover.find("#pixel-colour-preview").removeClass("is-white");
            popover.find("#pixel-use-colour-btn").attr("data-represented-colour", data.pixel.colour);
            popover.find(".rank-container > *").remove();
            if(hasUser) {
                var userInfoCtn = popover.find(".user-info");
                userInfoCtn.show();
                userInfoCtn.find(".field").remove();
                getUserInfoTableItem("Total pixels placed", data.pixel.user.statistics.totalPlaces.toLocaleString()).appendTo(userInfoCtn);
                if(data.pixel.user.statistics.placesThisWeek !== null) getUserInfoTableItem("Pixels this week", data.pixel.user.statistics.placesThisWeek.toLocaleString()).appendTo(userInfoCtn);
                getUserInfoDateTableItem("Account created", data.pixel.user.creationDate).appendTo(userInfoCtn);
                var latestCtn = getUserInfoDateTableItem("Last placed", data.pixel.user.statistics.lastPlace).appendTo(userInfoCtn);
                if(data.pixel.user.latestPixel && data.pixel.user.latestPixel.isLatest) {
                    var latest = data.pixel.user.latestPixel;
                    var element = $("<div>")
                    if(data.pixel.point.x == latest.point.x && data.pixel.point.y == latest.point.y) $("<span>").addClass("secondary-info").text("(this pixel)").appendTo(element);
                    else $("<a>").attr("href", "javascript:void(0)").text(`at (${latest.point.x.toLocaleString()}, ${latest.point.y.toLocaleString()})`).click(() => app.zoomIntoPoint(latest.point.x, latest.point.y, false)).appendTo(element);
                    element.appendTo(latestCtn.find(".value"));
                }
                popover.find("#pixel-data-username").attr("href", `/@${data.pixel.user.username}`);
                var rankContainer = popover.find(".rank-container");
                data.pixel.user.badges.forEach((badge) => renderBadge(badge).appendTo(rankContainer));
                popover.find("#user-actions-dropdown-ctn").html(renderUserActionsDropdown(data.pixel.user));
            } else {
                popover.find(".user-info, #pixel-badge, #pixel-user-state-badge").hide();
                popover.find("#user-actions-dropdown-ctn").html("");
                popover.find("#pixel-data-username").removeAttr("href");
            }
        });
    },

    setPixel: function(colour, x, y) {
        this.canvasController.setPixel(colour, x, y);
        this.updateDisplayCanvas();
    },

    doKeys: function() {
        var keys = Object.keys(this.keys).filter((key) => this.keys[key].filter((keyCode) => this.keyStates[keyCode] === true).length > 0);
        if(keys.indexOf("up") > -1) this.moveCamera(0, 5, false);
        if(keys.indexOf("down") > -1) this.moveCamera(0, -5, false);
        if(keys.indexOf("left") > -1) this.moveCamera(5, 0, false);
        if(keys.indexOf("right") > -1) this.moveCamera(-5, 0, false);
    },

    handleKeyDown: function(keycode) {
        if(keycode == 71) { // G - Grid
            this.toggleGrid();
        } else if(keycode == 32) { // Spacebar - Toggle Zoom
            this.toggleZoom();
        } else if(keycode == 80) { // P - pick colour under mouse cursor
            this.pickColourUnderCursor();
        }
    },

    adjustLoadingScreen: function(text = null) {
        if(text) {
            $("#loading").show().find(".text").text(text);
        } else {
            $("#loading").fadeOut();
        }
    },

    getUserStateText: function(userState) {
        if(userState == "ban") return "Banned user";
        if(userState == "deactivated") return "Deactivated user";
        return "Deleted account";
    }
};

place.start($("canvas#place-canvas-draw")[0], $("#zoom-controller")[0], $("#camera-controller")[0], $("canvas#place-canvas")[0], $("#palette")[0], $("#coordinates")[0], $("#user-count")[0], $("#grid-hint")[0], $("#pixel-data-ctn")[0], $("#grid")[0]);
place.setZoomButton($("#zoom-button")[0]);
place.setGridButton($("#grid-button")[0]);
place.setCoordinatesButton($("#coordinates")[0]);