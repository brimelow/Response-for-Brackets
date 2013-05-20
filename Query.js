(function(window) {

	// Built this way before I got into Brackets and RequireJS.
	// This is a 'class' that represents a single media query.
	function Query(width) {

		// Setup up a bunch of properties.
		this.color;
		this.colorIndex = 0;
		this.width = width;
		this.selectors = {};
		this.view = null;
		this.left = 0;
		this.selector = [];
	}

	// An object that represents a selector and all its rules.
	function Selector() {
		this.rules = {};
	}

	// Function that you call when you want add a new CSS rule
	// to the media query.
	Query.prototype.addRule = function(selector, rule) {
		
		// If the selector doesn't exist in this query, add it.
		if(this.selectors[selector] == null)
			this.selectors[selector] = new Selector();
		
		// Separate the CSS property and the value.
		var style = rule.trim().split(':');
		
		if(style[1] != undefined)
			this.selectors[selector].rules[style[0]] = style[1];
	}

	//Exposes the Query object the global scope.
	window.Query = Query;

})(window);