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
/*global define, brackets, $, TweenMax */

/**
 * DomCache.js Module
 *
 * Responsible for maintaining a mapping between the dom elements in the ifrmae and the code in the 
 * current main editor based on line numbers
 */

define(function (require, exports, module) {
	"use strict";

	var	EditorManager           = brackets.getModule("editor/EditorManager"),
	
		// stores an array of dom elmeents in the iframe preview window
		frDOM = [],
		
		// stores an array of dom elements in the main editor
		cmDOM = [];

	/**
	 * clears the cache
	 */
	function clearCache() {
		frDOM = [];
		cmDOM = [];
	}
	
	/** 
	 *  Function that creates a mapping between DOM elements in the iframe and
	 *  the corresponding line numbers for the elements in the codemirror editor.
	 *
	 *  First it goes through all of the codemirror lines in the editor 
	 *  and matches tags with line numbers.
	 *  
	 *  Secondly it takes that codemirror info and finds the locations
	 *  of the actual DOM elements in the iframe.
	 */
	function build() {
		
		if (document.querySelector('#response')) {

			console.debug("building dom cache");
			
			var cm = EditorManager.getCurrentFullEditor()._codeMirror,
				frameDOM = document.getElementById("frame").contentWindow.document,
				lines = cm.getValue().split(/\n/),
				tag,
				i,
				j,
				len;

			// clear the cache
			frDOM = [];
			cmDOM = [];
			
			for (i = 0; i < lines.length; i++) {
				var tags = lines[i].match(/(?:<)(\w+)(?=\s|>)/g);

				if (tags) {
					for (j = 0; j < tags.length; j++) {
						tag = tags[j].substr(1);
						if (cmDOM[tag] === undefined) {
							cmDOM[tag] = [];
						}
						cmDOM[tag].push(i);
					}
				}

			}

			for (tag in cmDOM) {
				if (cmDOM.hasOwnProperty(tag)) {
					if (frDOM[tag] === undefined) {
						frDOM[tag] = [];
					}

					var elements = $(frameDOM.body).find(tag);

					for (i = 0, len = elements.length; i < len; i++) {
						frDOM[tag].push(elements[i]);
					}
				}
			}
			
		} else {
			clearCache();
		}
	}
	
	/**
	 * gets the DOM cache
	 */
	function getCache() {
		
		// rebuild the cache
		build();
		
		return {
			frameDom: frDOM,
			codeDom: cmDOM
		};
	}
	
	function rebuildCache() {
		build();
	}
	
	exports.getCache = getCache;
	exports.clearCache = clearCache;
	exports.rebuildCache = rebuildCache;
});
