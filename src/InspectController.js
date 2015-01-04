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
/*global define, brackets, $ */

/**
 * InspectController.js Module
 * Responsible for managing the state and behaviour of the inspect feature
 */

define(function (require, exports, module) {
	"use strict";

	/*================ Load needed brackets modules ================*/

	var EventDispatcher			= brackets.getModule("utils/EventDispatcher"),
		EditorManager			= brackets.getModule("editor/EditorManager"),
		CommandManager			= brackets.getModule("command/CommandManager"),

	/*================ Load custom modules ================*/

		DomCache				= require("utils/DomCache"),
		QueryManager			= require("query/QueryManager"),
		Strings					= require("strings"),

	/*================  Define module properties  ================*/

		// indicates if the inspect feature is turned on or off
		enabled = false,
		
		// represents the current item that is highlighted. maps the
		// frame elment to the code editor line
		selectedEl = null,
		
		// responsible for 'highlighting' elements in the iframe web page
		domHighlight = null,
		
		// indicates that the frame or code editor is scrolling due to a
		// user click. Any futher clicks should be ignored until animation
		// finishes
		isAnimating = false,
		
		// reference to the iframe dom
		frameDOM = null,
		frame = null,
		
		// reference to the inspectBtn in the toolbar
		inspectBtn = null;

	/*================  event handlers  ================*/

	/** 
	 *  Function that positions the highlight over a certain DOM element.
	 *  @param: a DOM element you want to highlight.
	 *  The animation of the this highlight is all done using CSS transitions.
	 */
	function _positionDomHighlight(el) {

		// If the element passed is bunk or were not in inspect mode, just leave. 
		if (enabled && el) {
			
			var x = 0;
			var y = 0;

			// Create a temporary reference to the element.
			var tempEl = el;

			// This loop walks up the DOM tree and calculates the correct left
			// and top properties taking into account the element's ancestors.
			while (tempEl) {
				x += tempEl.offsetLeft;
				y += tempEl.offsetTop;
				tempEl = tempEl.offsetParent;
			}

			// Turn on the highlight and position the top and left.
			domHighlight.css({
				'display': 'block',
				'left': x + 'px',
				'top': y + 'px',
				'width': (el.offsetWidth > 0) ? el.offsetWidth + 'px' : el.style.width,
				'height': (el.offsetHeight > 0) ? el.offsetHeight + 'px' : el.style.height
			});
		}
	}

	/** 
	 *  Called when the user clicks on a line of code in the editor while in inspect mode.
	 */
	function _handleCodeClick(e) {

		try {
			console.debug("_handleCodeClick triggered");

			if (e) {
				e.stopImmediatePropagation();
			}

			// Ignore if either the iframe or code editor is scrolling
			if (isAnimating) {
				return;
			}

			// get code mirror from main editor
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;

			// Get current cursor location.
			var cur = cm.getCursor(),
				line = cur.line;

			// Get the HTML tag name that the cursor is currently on.
			var tag = cm.getTokenAt(cur).state.htmlState.tagName;

			var ind;

			// If there is already a selected line with a highlight, remove the highlight.
			if (selectedEl) {
				cm.removeLineClass(selectedEl.line, "background");
			}

			var domCache = DomCache.getCache();

			// Check to see if the editor even contains any tags of this type.
			if (domCache.codeDom[tag]) {

				// Find out index position of the tag amongst all of the existing tags of this type.   
				ind = domCache.codeDom[tag].indexOf(line);

				// Now find the corrensponding DOM element using the position index.
				// IMPORTANT: If the user adds or changes lines in the HTML editor you will
				// need to rebuild the mapping cache. I never wrote the code for that.
				var el = domCache.frameDom[tag][ind];

				// If we found an element and the inline editor isn't open, then proceed.
				if (el) {

					// Set the selected line object using the line number and DOM element.
					selectedEl = {el: el, line: line};

					// Boolean that tells you if the scroll position of the iframe is currently being animated.
					isAnimating = true;

					// Here we take the color of the current query and use it highlight the code line.
					var cq = QueryManager.getCurrentQueryMark();
					if (cq) {
						var cl = "l" + cq.colorIndex.toString();
						cm.addLineClass(line, "background", cl);

					} else {
						// If there is no current query, just make the highlight the blue color.
						cm.addLineClass(line, "background", "l0");
					}

					// The correct DOM element is now animated into view in the iframe using the
					// TweenMax library. This just animates the scrollTop property of the body.
					TweenMax.to(frameDOM.body, 0.8, {
						scrollTop: (el.offsetTop - frame.offsetHeight * 0.5) + el.offsetHeight * 0.5,
						ease: 'Expo.easeOut',
						onComplete: function () {
							isAnimating = false;
						}
					});

					// Adjust the highlight to show the selected element.
					_positionDomHighlight(el);
				}
			}
			
		} catch (err) {
			console.error("unexpected excpetion trying to handle code click while inspect feature is eabled", err);
			isAnimating = false;
		}
	}
	
	/**
	 * responsible to handle when an element is clicked in the iframe dom. The result
	 * should scroll the main cursort to the element
	 */
	function _handleFrameClick(e) {

		try {
			console.debug("_handleFrameClick triggered");

			if (e) {
				e.stopImmediatePropagation();
			}


			// Ignore if either the iframe or code editor is scrolling
			if (isAnimating) {
				return;
			}

			// Boolean that tells you if the scroll position of the iframe is currently being animated.
			isAnimating = true;
			
			// get code mirror from main editor
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;

			var target = e.target;

			// If there is already a selected line of code, remove the background highlight.
			if (selectedEl) {
				cm.removeLineClass(selectedEl.line, "background");
			}

			var tag = target.tagName.toLowerCase();
			var domCache = DomCache.getCache();

			// Find out the position index of the this tag in the cache.
			var ind = domCache.frameDom[tag].indexOf(target);

			// We'll use the codemirror scroller element to animate our code into view.
			var scroller = cm.display.scroller;
			window.scroller = scroller;
			var editorHeight = (scroller.offsetHeight > 0) ? scroller.offsetHeight : parseInt(scroller.style.height, 10);

			// Find out the correct line number from the cache.
			var line = domCache.codeDom[tag][ind];

			// Set this as the new selected line.
			selectedEl = {el: target, line: line};

			// If there is a current query, use its color to highlight the code line.
			var cq = QueryManager.getCurrentQueryMark();
			if (cq) {
				var cl = "l" + cq.colorIndex.toString();
				cm.addLineClass(line, "background", cl);

			} else {
				// If there's not, just use the blue color.
				cm.addLineClass(line, "background", "l0");
			}

			// Calculate the correct scrollTop value that will make the line be in the center.
			var documentCurPos = cm.charCoords({line: line, ch: 0}, "local").bottom;
			var pos = documentCurPos - editorHeight * 0.5;

			var info = cm.getScrollInfo();
			pos = Math.min(Math.max(pos, 0), (info.height - info.clientHeight));

			// Use TweenMax to animate our code to the correct position. When the animation is
			// done we position the cursor on the that line inside the correct tag.
			TweenMax.to(scroller, 0.5, {
				scrollTop: pos,
				roundProps: 'scrollTop',
				ease: 'Expo.easeOut',
				onComplete: function () {
					cm.setCursor(line, cm.getLine(line).indexOf('<') + 1);
					isAnimating = false;
				}
			});

		} catch (err) {
			console.error("an unexpected exception occurred trying hand click on frame while the inspect feature is enabled", err);
			isAnimating = false;
		}
	}
	
	/** 
	 *  Called when user mouses off the iframe.
	 */
	function _handleFrameMouseOut() {
		// Hide the highlight if the inline editor isn't open. Just a UI tweak.
		domHighlight.css('display', 'none');
	}

	/**
	 *  Called when the user hovers over an element in the iframe while in inspect mode.
	 */
	function _handleInspectHover(e) {

		if (e) {
			e.stopImmediatePropagation();
		}

		// position the highlight.
		_positionDomHighlight(e.target);
	}

	/**
	 * enables/disables the inspect feature
	 */
	function _toggleInspectMode(enable) {
		
		console.debug('_toggleInspectMode invoked [enable: ' + enable + ']');
		
		enabled = enable;
		
		// because the frameDOM has been set, we can assume that we are in responsive mode
		if (frameDOM) {
			
			// get code mirror from main editor
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;
			
			// change the button visuals and remove any highlighted code lines
			// and the highlight div.
			
			if (enable) {

				// if menu state is now checked, means it was just turned on. 
				inspectBtn.addClass("inspectButtonOn");
				
				if (domHighlight) {
					domHighlight.css('display', 'block');
				}
				
				selectedEl = null;
				
				frameDOM.body.addEventListener('click', _handleFrameClick, false);
				frameDOM.body.addEventListener('mouseover', _handleInspectHover, false);
				cm.display.wrapper.addEventListener('click', _handleCodeClick, false);
				frame.addEventListener('mouseout', _handleFrameMouseOut, false);
				
			} else {

				// If menu state is no longer checked, then it was just turned off
				inspectBtn.removeClass("inspectButtonOn");
				
				if (selectedEl) {
					cm.removeLineClass(selectedEl.line, "background");
				}
				
				if (domHighlight) {
					domHighlight.css('display', 'none');
				}
				
				cm.display.wrapper.removeEventListener('click', _handleCodeClick);
				frameDOM.body.removeEventListener('mouseover', _handleInspectHover);
				frameDOM.body.removeEventListener('click', _handleFrameClick);
				frame.removeEventListener('mouseout', _handleFrameMouseOut);
			}
		}
	}
	
	/*================  prototype functionality  ================*/

	/**
	 * @constructor
	 */
	function InspectController() {

	}

	InspectController.prototype.positionDomHighlight = function (el) {
		_positionDomHighlight(el);
	};

	InspectController.prototype.toggleInspectMode = function (enable) {
		_toggleInspectMode(enable);
	};
	
	InspectController.prototype.handleInspectToggle = function () {
		// update the inspect menu state
		this.setChecked(!this.getChecked());
		_toggleInspectMode(this.getChecked());
	};
	
	InspectController.prototype.open = function () {
		
		console.info('opening the inspector feature');
		
		// get a reference to the current iframe dom
		frameDOM = document.getElementById("frame").contentWindow.document;
		frame = document.getElementById('frame');
		
		// Create the highlight effect div that we use when in inspect mode and add to the frame dom.
		// Note: This should be moved into an external css file but it needs to be part of the 
		//       iframe dom.
		var styleCss = {
			'outline': 'rgba(0, 0, 0, 0.617188) solid 2000px',
			'display': 'none',
			'-webkit-transition': 'top 0.2s, left 0.2s, width 0.2s, height 0.2s',
			'-webkit-transition-timing-func': 'easeOut',
			'position': 'absolute',
			'width': '354px',
			'height': '384px',
			'background-color': 'transparent',
			'top': '1420px',
			'z-index': 0,
			'left': '713px',
			'margin': 0,
			'padding': 0,
			'pointer-events': 'none'
		};
		
		domHighlight = $('<div/>').attr('id', 'highlight').css(styleCss).appendTo(frameDOM.body);
		
		// get a reference to the inspect button in the toolbar
		inspectBtn = $('#inspectButton');

		// update the inspect mode based on the menu state
		var command = CommandManager.get(Strings.CMD_INSPECTMODE_ID);
		_toggleInspectMode(command.getChecked());
	};
	
	InspectController.prototype.close = function () {
		
		console.info('closing the inspector feature');
		
		// turn off inspect node (leave menu unchanged)
		_toggleInspectMode(false);

		// reset state
		selectedEl = null;
		domHighlight = null;
		inspectBtn = null;
		frameDOM = null;
		frame = null;
	};
	
	//exports.handleInspectToggle = handleInspectToggle;
	exports.InspectController = InspectController;
});
