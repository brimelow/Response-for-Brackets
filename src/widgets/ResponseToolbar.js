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
 */
define(function (require, exports, module) {
	"use strict";

	var EventDispatcher		= brackets.getModule("utils/EventDispatcher"),
		Strings				= require("strings"),
	
		/**
		 * @private
		 * The template we use to generate the toolbar html.
		 * @type {string}
		 */
		_htmlTemplate		= require("text!htmlContent/response-toolbar.html"),
		
		$slider = null,
		$trackLabel = null;
	
	function handleSliderChange(e) {

		var newValue = e.target.value;
		console.log("slider value changed [new value: " + newValue + "]");
		
		// Set the width of the frame to match the slider value.
		var frame = $('#response iframe');
		frame.css('width', newValue + 'px');
		
		// update the track label with the current value
		$trackLabel.text(newValue + 'px');

	}
	
	/**
	 * @constructor
	 */
	function ResponseToolbar() {
		
		this.$toolbar = $(Mustache.render(_htmlTemplate, Strings));
		$slider = $('#slider', this.$toolbar).on('change', handleSliderChange);
		$slider.value = $slider.max = this.$toolbar.offsetWidth;
		$trackLabel = $('#track-label', this.$toolbar);
	}

	//exports.trigger("beforeProjectClose", model.projectRoot);
	
	ResponseToolbar.prototype.$toolbar = null;
	
    EventDispatcher.makeEventDispatcher(exports);
	
	exports.ResponseToolbar = ResponseToolbar;
});
