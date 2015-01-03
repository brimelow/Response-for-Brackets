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

	/*================ Load needed brackets modules ================*/

	var EventDispatcher			= brackets.getModule("utils/EventDispatcher"),
		FileUtils				= brackets.getModule("file/FileUtils"),

	/*================ Load custom modules ================*/

		Strings					= require("strings"),
	
		// represents a media query and its custom selectors/rules
		QueryManager			= require("query/QueryManager"),

	/*================  Define module properties  ================*/

		/**
		 * @private
		 * The template we use to generate the toolbar html.
		 * @type {string}
		 */
		_htmlTemplate			= require("text!htmlContent/response-toolbar.html"),
		
		/* instance variables for various html elements in the toolbar */
		$slider = null,
		$track = null,
		$trackLabel = null,

		modulePath = FileUtils.getNativeModuleDirectoryPath(module);

	/*================  event handlers  ================*/

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
	 * responsible for handling clicks on the query mark track when the user wants to 
	 * switch between media query widths
	 */
	function handleQueryTrackClicked(e) {
		
		// parse the width from the id. 9 is the length of queryMark prefix in id
		var w = parseInt(e.target.id.substr(9), 10);
		
		var q = QueryManager.getQueryMark(w);
		var cq = QueryManager.getCurrentQueryMark();
		
		// if current query is not set or the new width doesn't match the current query
		// then update the current query and query track
		if (!cq || q.width !== cq.width) {
			// Set the clicked query as the current query.
			QueryManager.setCurrentQueryMark(q);
			this.setQueryWidth(w);
		}
	}

	/** 
	 * Called when the user clicks on the + button to add a new query.
	 * It will create a new query and set it as the current query and then
	 * refresh the query mark tracks so it is displayed
	 */
	function handleAddQueryTrackClicked(e) {
		
		var w = $slider.val();
		
		var query = QueryManager.getQueryMark(w);
		if (!query) {
			query = QueryManager.addQueryMark(w);
			QueryManager.setCurrentQueryMark(query);

			this.refreshQueryMarkTracks();
		}
	}

	/*================  prototype functionality  ================*/

	/**
	 * @constructor
	 */
	function ResponseToolbar() {
		
		this.$toolbar = $(Mustache.render(_htmlTemplate, Strings));
		$slider = $('#slider', this.$toolbar).on('change', $.proxy(handleSliderChange, this));
		$('#addButt', this.$toolbar).on('click', $.proxy(handleAddQueryTrackClicked, this));
		
		$track = $('#track', this.$toolbar);
		$trackLabel = $('#track-label', this.$toolbar);
		
	}
	
	ResponseToolbar.prototype.$toolbar = null;
	
	ResponseToolbar.prototype.setQueryWidth = function (width) {
		
		if (width !== $slider.val()) {
			// update the slider position
			$slider.val(width);

			// Set the width of the frame to match the slider value.
			var iframeEl = $('#response iframe');
			iframeEl.css('width', width + 'px');

			// update the track label with the current value
			$trackLabel.text(width + 'px');
		}
	};
	
	ResponseToolbar.prototype.resize = function (width, force) {

		// set the max width
		$slider.attr('max', width);		
		
		this.setQueryWidth(width);
		//QueryManager.setCurrentQueryMark(null);
	};


	/**
	 * displays the media query tracks above the slider in the preview pane.
	 */
	ResponseToolbar.prototype.refreshQueryMarkTracks = function () {

		var queries = QueryManager.getSortedQueryMarks(),
			query,
			mark,
			markStyle,
			i,
			z = 5000;
		
		for (i = 0; i < queries.length; i++) {
			
			query = queries[i];
			
			// if query mark div does not yet exist, create it and add to track
			mark = $('#queryMark' + query.width);
			if (mark.length === 0) {
				
				markStyle = {
					'width': query.width + 'px',
					'background': "url('file://" + modulePath + "/../images/ruler_min.png') " +
						"0px 0px no-repeat, " +
						"-webkit-gradient(linear, left top, left bottom, from(" + query.color.t + "), to(" + query.color.b + "))"
				};
				
				mark = $("<div/>")
							.attr('id', 'queryMark' + query.width)
							.addClass('mark')
							.css(markStyle)
							.appendTo($track);
				$("<div/>").addClass("wd").text(query.width + 'px').appendTo(mark);
				
				// add listener for when user clicks on an item1
				mark.on('click', $.proxy(handleQueryTrackClicked, this));
			}
			
			// update z-index on all elements so shorter widths have higher value (to make clickable)
			mark.css('z-index', z--);
		}
		
		// position the slider if a current query has been set
		var cq = QueryManager.getCurrentQueryMark();
		if (cq) {
			this.setQueryWidth(cq.width);
		}
		
	}
	
	EventDispatcher.makeEventDispatcher(ResponseToolbar.prototype);
	
	exports.ResponseToolbar = ResponseToolbar;
});
