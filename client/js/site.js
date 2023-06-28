var renderBadge = function(badge, prefersShortText = false) {
	var badge = $("<span>").addClass(`label badge-label label-${badge.style || "default"}`).text(prefersShortText && badge.shortText ? badge.shortText : badge.text);
	if(badge.title) badge.attr("title", badge.title);
	return badge;
}

var hashHandler = {
    getHash: function() {
        return this.decodeHash(window.location.hash);
    },

    setHash: function(hash) {
        var encodedHash = this.encodeHash(hash);
        if("history" in window) window.history.replaceState(undefined, undefined, "#" + encodedHash);
        else location.replace("#" + encodedHash);
    },

    modifyHash: function(newHash) {
        this.setHash(Object.assign(this.getHash(), newHash));
    },

    deleteHashKey: function(keys) {
        var keysToUse = keys;
        if(typeof keys == "string") keysToUse = [keys];
        var hash = this.getHash();
        keysToUse.forEach((key) => delete hash[key]);
        this.setHash(hash);
    },

    decodeHash: function(hashString) {
        if(hashString.indexOf("#") === 0) hashString = hashString.substring(1);
        if (hashString.length <= 0) return {};
        var hashArguments = hashString.split("&");
        var decoded = {};
        hashArguments.forEach(function(hashArg) {
            var parts = hashArg.split("=");
            var key = parts[0], value = decodeURIComponent(parts[1]);
            if(key) decoded[key] = value;
        });
        return decoded;
    },

    encodeHash: function(hash) {
        return $.param(hash);
    }
}

// Mobile Safari in standalone mode - from https://gist.github.com/kylebarrow/1042026
if(("standalone" in window.navigator) && window.navigator.standalone){
	// If you want to prevent remote links in standalone web apps opening Mobile Safari, change 'remotes' to true
	var noddy, remotes = false;
	
	document.addEventListener("click", function(event) {
		
		noddy = event.target;
		
		// Bubble up until we hit link or top HTML element. Warning: BODY element is not compulsory so better to stop on HTML
		while(noddy.nodeName !== "A" && noddy.nodeName !== "HTML") {
	        noddy = noddy.parentNode;
	    }
		
		if("href" in noddy && noddy.href.indexOf("http") !== -1 && (noddy.href.indexOf(document.location.host) !== -1 || remotes))
		{
			event.preventDefault();
			document.location.href = noddy.href;
		}
	
	}, false);
}

$(document).ready(function () {
    $(".timeago").timeago();
});