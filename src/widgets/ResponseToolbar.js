/*The MIT License (MIT)

Copyright (c) 2014 Lee Brimelow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache */

/*
 * ResponseToolbar.js
 *
 * UI for the responsive toolbar in the preview pane
 *
 * This module dispatches these events:
 *    - queryWidthChanged -- when the slider value has chnaged. It includes the new value that the slider has been set to
 *
 * To listen to events, attach an 'on' listener to the toolbar instance
 *
 *		var toolbar = new ResponseToolbar();
 *		toolbar.on('queryWidthChanged', function(e, newVal) { };
 */
define(function (require, exports, module) {
	"use strict";

	var EventDispatcher		= brackets.getModule("utils/EventDispatcher"),
		
		Strings				= require("strings"),
	
		// represents a media query and its custom selectors/rules
		QueryManager			= require("query/QueryManager"),

		/**
		 * @private
		 * The template we use to generate the toolbar html.
		 * @type {string}
		 */
		_htmlTemplate		= require("text!htmlContent/response-toolbar.html"),
		
		$slider = null,
		$trackLabel = null;
	
	/**
	 * responsible for handling any changes to the slider. It will update the track label and
	 * the width of the iframe. It also triggers a queryWidthChanged event that any clients
	 * can listen to.
	 */
	function handleSliderChange(e) {

		var newValue = e.target.value;
		console.log("slider value changed [new value: " + newValue + "]");
		
		this.setQueryWidth(newValue);

		this.trigger("queryWidthChanged", newValue);
	}
	
	/**
	 * @constructor
	 */
	function ResponseToolbar() {
		
		this.$toolbar = $(Mustache.render(_htmlTemplate, Strings));
		$slider = $('#slider', this.$toolbar).on('change', $.proxy(handleSliderChange, this));
		$trackLabel = $('#track-label', this.$toolbar);
	}
	
	ResponseToolbar.prototype.$toolbar = null;
	
	ResponseToolbar.prototype.setQueryWidth = function (val) {
		
		// Set the width of the frame to match the slider value.
		var frame = $('#response iframe');
		frame.css('width', val + 'px');
		
		// update the track label with the current value
		$trackLabel.text(val + 'px');
	};
	
	ResponseToolbar.prototype.resize = function(width, force) {

		// set the max width
		$slider.attr('max', width);		
		$slider.val(width);
		this.setQueryWidth(width);
		QueryManager.setCurrentQueryMark(null);
	};
	
    EventDispatcher.makeEventDispatcher(ResponseToolbar.prototype);
	
	exports.ResponseToolbar = ResponseToolbar;
});
