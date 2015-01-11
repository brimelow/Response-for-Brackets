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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, bitwise:true, indent: 4, maxerr: 150 */
/*global define, brackets, $, TweenMax */

/* This is eseentially all of the responsive feature stuffed into a single file */

define(function (require, exports, module) {
	"use strict";

	/*====================  Define constants  =====================*/

	var EXT_PREFIX				= "responsive",

		// The 'constant' for vertical or horizontal mode.
		VERTICAL = 0,
		HORIZONTAL = 1,

	/*================ Load needed brackets modules ================*/

		CommandManager			= brackets.getModule("command/CommandManager"),
		Menus					= brackets.getModule("command/Menus"),
		DocumentManager			= brackets.getModule("document/DocumentManager"),
		MainViewManager			= brackets.getModule("view/MainViewManager"),
		WorkspaceManager		= brackets.getModule("view/WorkspaceManager"),
		FileUtils				= brackets.getModule("file/FileUtils"),
		FileSystem				= brackets.getModule("filesystem/FileSystem"),
		ProjectManager			= brackets.getModule("project/ProjectManager"),
		EditorManager			= brackets.getModule("editor/EditorManager"),
		ExtensionUtils			= brackets.getModule("utils/ExtensionUtils"),
		AppInit					= brackets.getModule("utils/AppInit"),
		CSSUtils				= brackets.getModule("language/CSSUtils"),
		HTMLUtils				= brackets.getModule("language/HTMLUtils"),
		PreferencesManager		= brackets.getModule("preferences/PreferencesManager"),
	
	/*================  Load custom modules  ================*/

		// This is a much lighter-weight version of the MultiRangeInlineTextEditor.
		// Ideally I could would be able to use the InlineTextEditor we can't yet.
		ResponseInlineEdit		= require("widgets/ResponseInlineEdit").ResponseInlineEdit,

		// Used to ask users if they want to refresh preview pane when switching
		// between HTML documents
		DocReloadBar			= require("widgets/DocReloadBar").DocReloadBar,

		// This much lighter-weight version of the Resizer utility
		Splitter				= require("widgets/Splitter").Splitter,

		// Represents the toolbar at the top of the preview pane
		ResponseToolbar			= require("widgets/ResponseToolbar").ResponseToolbar,
		
		// Set of DOM and CSS utility methods.
		ResponseUtils			= require("utils/ResponseUtils"),

		// Set of DOM and CSS utility methods.
		DomCache				= require("utils/DomCache"),

		// represents a media query and its custom selectors/rules
		Query					= require("query/Query").Query,
		QueryManager			= require("query/QueryManager"),

		// responsible for controlling the inspect feature
		InspectController		= require("InspectController").InspectController,

		// Load the nls string module for this plugin. 
		Strings					= require("strings"),

	/*================  Define module properties  ================*/
	
		// Reference to the DocReloadBar
		docReloadBar,
	
		// Reference to the ResponseToolbar in the preview pane
		toolbar,
		
		// Reference to the InspectController
		inspectController = new InspectController(),
		
		// Configure preferences for the extension
		prefs = PreferencesManager.getExtensionPrefs(EXT_PREFIX),

		// Path to this extension.
		modulePath,

		// Path to the current open project.
		projectRoot,

		// Document for the generated media-queries.css file.
		mediaQueryDoc,

		// TODO: should be removed from global scope
		// Element whose CSS rules are being show in the inline editor.
		inlineElement,
		
		// Iframe containing the live HTML preview.
		frame,

		// The .main-view div in Brackets core.
		mainView,

		// Main container for the response tools and iFrame.
		response,

		// The current layout mode.
		mode = VERTICAL,

		// Document object of iframe.
		frameDOM,

		// TODO: should be removed from global scope
		// Results returned from ResponseUtils.getAuthorCSSRules().
		cssResults,

		// A style block we will inject into the iframe.
		style,

		// The splitter that allows resizing of the split view.
		splitter,

		// indicates whether we are currently working with livePreviewUrl or local files
		workingMode,

		// reference to the left hand toolbar icon to open/close response mode
		iconLink;
	
	/*================  Begin function definitions  ================*/


	/**
	 * Responsible for closing any open inline editors.
	 *
	 * Note, we are making use of Document._masterEditor in order to get the editor
	 * associated to the document. This may not be 'legel' but seems to be the only
	 * way to get the editor associated to a document
	 */
	function closeOpenInlineEditors() {

		var i, len;

		try {
			var openDocs = DocumentManager.getAllOpenDocuments();
			for (i = 0; i < openDocs.length; i++) {

				var editor = openDocs[i]._masterEditor;

				if (editor !== null) {
					var inlineWidgets = editor.getInlineWidgets();

					// when closing widgets, the array is being modified so need to 
					// iterate by modifying the length value
					len = inlineWidgets.length;
					while (len--) {
						EditorManager.closeInlineWidget(editor, inlineWidgets[len]);
					}
				}
			}
		} catch (err) {
			console.error("unexpected error occurred trying to close inline widgets", err);
		}
	}

	/** 
	 *  Function that goes through all of the media query data and writes it to the 
	 *  style block in the iframe and also to the media-queries.css file.
	 */
	function refreshIFrameMediaQueries(writeToFile) {

		// only update if the reference to the style element has been set
		if (style) {
			// Defining some vars we'll need.
			var s = "",
				sortedQueries = QueryManager.getSortedQueryMarks(),
				i = sortedQueries.length,
				query,
				sel,
				k;

			// Loop through the queries and write them to the output string.
			while (i--) {

				// We need to sort the queries so the larger widths are written first
				// in order for inheritance to work properly.
				query = sortedQueries[i];

				s += '@media only screen and (max-width:';
				s += query.width;
				s += 'px) {\n\n';
				for (sel in query.selectors) {
					if (query.selectors.hasOwnProperty(sel)) {
						s += '\t' + sel + ' {\n';
						for (k in query.selectors[sel].rules) {
							if (query.selectors[sel].rules.hasOwnProperty(k)) {
								s += '\t\t' + k + ": " + query.selectors[sel].rules[k] + '\n';
							}
						}
						s += '\t}\n\n';
					}
				}
				s += '}\n';
			}

			// Set the style block in the iframe using the output string. 
			style.textContent = s;

			// Write the new text to the media-queries.css file.
			if (writeToFile === undefined || writeToFile) {
				FileUtils.writeText(mediaQueryDoc.file, s);
			}
		}
	}

	function showHorizontalLayout() {
		
		// Update only if the response element exists
		if (document.querySelector('#response')) {

			// update the global class to indicate layout
			document.body.classList.remove('response-vert');
			document.body.classList.add('response-horz');

			// clear any inline css rules on div#response and div.main-view
			response.style.cssText = null;
			mainView.style.cssText = null;

			// Remove the current panel splitter
			if (splitter !== undefined) {
				response.removeChild(splitter);
			}

			// Create a new splitter for this mode
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;
			Splitter.makeResizable(response, 'horz', 344, cm);
			splitter = document.querySelector('.horz-splitter');
			splitter.style.right = '-16px';
			
			var w = window.innerWidth;

			// Change to a left/right layout
			response.style.width = (w * 0.5) + 'px';
			mainView.style.left = (response.offsetWidth + 15) + 'px';
			mainView.style.height = '100%';
			
			toolbar.resize(response.offsetWidth);
			
			// refresh layout
			WorkspaceManager.recomputeLayout(true);
		}
	}

	/** 
	 *  Called when the user clicks on one of the editor layout
	 *  toggle buttons (either vertical or horizontal)
	 *
	 * note: the buttons are not named correctly. the 'horzButt' is actually 
	 * when the user is in vertical layout (up and down) while 'vertButt' is
	 * when the user is in horizontal layout (left to right). the code should
	 * be updated at some point to remove this confusion
	 */

	function handleHorzLayoutToggle(e) {

		var btnClicked = false;
		
		// if e is defined then it means the click came from the button in the preview pane. 
		// need to check if it is not already 'active' and signal it was clicked if it is 
		// not active
		if (e) {
			e.stopImmediatePropagation();
			btnClicked = !document.body.classList.contains('response-horz');
		}

		// check if the layout state has changed. making sure not clicking on an already
		// active menu
		var horzCmd = CommandManager.get(Strings.CMD_HORZLAYOUT_ID);
		if (btnClicked || !horzCmd.getChecked()) {
			
			// update menu state if not already correct
			horzCmd.setChecked(true);

			var vertCmd = CommandManager.get(Strings.CMD_VERTLAYOUT_ID);
			vertCmd.setChecked(false);
		
			// set the mode. would like to get rid of this variable and use menu state instead
			mode = HORIZONTAL;
			
			// update the layout if the preview pane is visible
			showHorizontalLayout();
		}
	}

	function showVerticalLayout() {
		
		// Update only if the response element exists
		if (document.querySelector('#response')) {

			// update the global class to indicate layout
			document.body.classList.remove('response-horz');
			document.body.classList.add('response-vert');

			// clear any inline css rules on div#response and div.main-view
			response.style.cssText = null;
			mainView.style.cssText = null;

			// Remove the current panel splitter
			if (splitter !== undefined) {
				response.removeChild(splitter);
			}

			// Create a new splitter for this mode
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;
			Splitter.makeResizable(response, 'vert', 100, cm);

			splitter = document.querySelector('.vert-splitter');

			var h = window.innerHeight;

			// Change to a top/bottom layout
			response.style.height = (h * 0.6) + 'px';
			mainView.style.height = (h - response.offsetHeight - 16) + 'px';
			
			toolbar.resize(response.offsetWidth);
			
			// refresh layout
			WorkspaceManager.recomputeLayout(true);
		}
	}

	function handleVertLayoutToggle(e) {

		var btnClicked = false;
		
		// if e is defined then it means the click came from the button in the preview pane. 
		// need to check if it is not already 'active' and signal it was clicked if it is 
		// not active
		if (e) {
			e.stopImmediatePropagation();
			btnClicked = !document.body.classList.contains('response-vert');
		}

		// check if the layout state has changed. making sure not clicking on an already
		// active menu
		var vertCmd = CommandManager.get(Strings.CMD_VERTLAYOUT_ID);
		if (btnClicked || !vertCmd.getChecked()) {
			
			// update menu state if not already correct
			vertCmd.setChecked(true);

			var horzCmd = CommandManager.get(Strings.CMD_HORZLAYOUT_ID);
			horzCmd.setChecked(false);
		
			// set the mode. would like to get rid of this variable and use menu state instead
			mode = VERTICAL;
			
			// update the layout if the preview pane is visible
			showVerticalLayout();
		}
	}

	/*================  Methods to handle document changes  ================*/
	
	/**
	 * responsible for handling when the current main document changes. It will show 
	 * a message to reload the preview pane bar
	 */
	function handleCurrentFilechange(e, newFile, newPaneId, oldFile, oldPaneId) {

		try {
			console.debug("currentFileChange event triggered", newFile, oldFile);
			
			var currentDoc = DocumentManager.getCurrentDocument();
			if (document.querySelector('#response') && workingMode === 'local' && currentDoc !== null && currentDoc.language.getId() === "html") {
				// open the doc reload bar so user can decide if the preview pane should be reloaded
				docReloadBar.open();
			}
		} catch (err) {
			console.error("unexpected error occurred trying to handle currentFileChange event", err);
		}
	}

	/**
	 * handles when the file has been modified from user editing. It will show 
	 * a message to reload the preview pane bar
	 */
	function handleDirtyFlagChange(e, doc) {

		try {
			console.debug("dirtyFlagChange event triggered", doc);
			
			var currentDoc = DocumentManager.getCurrentDocument();
			if (doc.isDirty && doc === currentDoc && workingMode === 'local' && currentDoc.language.getId() === "html") {
				// open the doc reload bar so user can decide if the preview pane should be reloaded
				docReloadBar.open();
			}

		} catch (err) {
			console.error("unexpected error occurred trying to handle currentFileChange event", err);
		}
	}

	/**
	 * handles when the document has been saved. It will refresh the preview pane and close
	 * any open doc reload bars
	 */
	function handleDocumentSaved(e, doc) {

		try {
			console.debug("documentSaved event triggered", doc);

			if (workingMode === 'local' && doc.language.getId() === "html") {
				// refresh the preview pane and close the reload bar
				ResponseUtils.refreshPreviewPane();
				docReloadBar.close();
			}

		} catch (err) {
			console.error("unexpected error occurred trying to handle currentFileChange event", err);
		}
	}
	
	function handleDocumentRefreshed(e, doc) {

		try {
			console.debug("documentRefreshed event triggered", doc);

			var currentDoc = DocumentManager.getCurrentDocument();
			if (doc === currentDoc && workingMode === 'local' && currentDoc.language.getId() === "html") {
				// open the doc reload bar so user can decide if the preview pane should be reloaded
				docReloadBar.open();
			}

		} catch (err) {
			console.error("unexpected error occurred trying to handle currentFileChange event", err);
		}
	}
 
	/** 
	 *  Builds the UI for responsive mode. Lots of DOM injecting here.
	 */
	function createResponseUI(previewPaneUrl) {

		var doc = document;
		doc.body.backgroundColor = "#303030";

		var cm = EditorManager.getCurrentFullEditor()._codeMirror;

		// create response main container and add to body
		response = $('<div id="response" class="quiet-scrollbars"/>')[0];
		doc.body.insertBefore(response, doc.body.firstChild);

		// create toolbar and add to response div element
		toolbar = new ResponseToolbar();
		toolbar.resize(response.offsetWidth, true);
		toolbar.$toolbar.appendTo(response);

		toolbar.on('queryWidthChanged', function (e, newVal) {
			console.log("queryWidthChanged triggered: " + newVal);
		});

		// add click handler for vertical/horizontal layout buttons
		var horzLayoutBtn = document.getElementById("horzButt");
		horzLayoutBtn.addEventListener('click', handleHorzLayoutToggle, false);
		var vertLayoutBtn = document.getElementById("vertButt");
		vertLayoutBtn.addEventListener('click', handleVertLayoutToggle, false);

		// Here I add the live preview iframe wrapped in a div.
		var domArray = [{tag: "div", attr: {id: "fwrap"}, parent: -1},
					{tag: "iframe", attr: {id: "frame", class: "quiet-scrollbars", name: "frame", src: previewPaneUrl}, parent: 0}];

		var frag = ResponseUtils.createDOMFragment(domArray);
		response.appendChild(frag);

		frame = doc.getElementById('frame');
		
		var h = window.innerHeight;

		// Set the initial heights of the panels to 60% response / 40% code editor.
		response.style.height = (h * 0.6) + 'px';
		mainView.style.height = (h - response.offsetHeight - 16) + 'px';

		// Create a vertical splitter to divide the editor and the response UI
		Splitter.makeResizable(response, 'vert', 100, cm);
		splitter = document.querySelector('.vert-splitter');
		
		// Manually fire the window resize event to position everything correctly.
		handleWindowResize(null);

		// Refresh codemirror
		cm.refresh();
	 
		setupEventHandlers();
	}

	/**
	 * Responsible for open the response mode which happens when the user clicks on the response icon
	 * in the main toolbar along the left
	 */
	function openResponseMode() {

		console.info('opening response mode');
		
		/**
		 * determines which URL to use in the iframe preview pane
		 */
		function _getPreviewPaneUrl() {
			
			var previewPaneUrl;
			
			workingMode = null;
			
			// check if we should be using the live preview url
			var command = CommandManager.get(Strings.CMD_PREVIEWURL_ID);
			if (command.getChecked()) {
				if (ProjectManager.getBaseUrl()) {
					previewPaneUrl = ProjectManager.getBaseUrl();
					workingMode = 'livePreviewUrl';
				} else {
					console.info("Live Preview Base URL not set under File > Project Settings. Need to let user know. defaulting to HTML file if it is open");
				}
			}
			
			// not configured to use live preview url. use current doc if it is an HTML
			if (!previewPaneUrl) {
				var currentDoc = DocumentManager.getCurrentDocument();
			
				// Only switch to responsive mode if the current document is HTML or 
				// a Live Preview Base URL has been defined under File > Project Settings and user
				// has chosen to open with Live Preview Base URL in the menu
				if (currentDoc !== null && currentDoc.language.getId() === "html") {
					previewPaneUrl = "file://" + currentDoc.file.fullPath;
					workingMode = 'local';
				} else {
					console.info("Unable to switch to Responsive mode as the current document is not HTML");
				}
			}

			// display message to user if unable to determine preview pane url
			if (!previewPaneUrl) {

				// Configure the twipsy
				var options = {
					placement: "left",
					trigger: "manual",
					autoHideDelay: 5000,
					title: function () {
						return Strings.ERR_PREVURL_UNAVAILABLE;
					}
				};


				// Show the twipsy with the explanation
				$("#response-icon").twipsy(options).twipsy("show");
			}
			
			return previewPaneUrl;
		}
		
		function _addDocumentHandlers() {
			
			MainViewManager.on("currentFileChange", handleCurrentFilechange);
	
			DocumentManager
				.on('dirtyFlagChange', handleDirtyFlagChange)
				.on('documentSaved', handleDocumentSaved)
				.on('documentRefreshed', handleDocumentRefreshed);
			
			// if the user switches to a new project, then close the reponse mode
			ProjectManager.on("beforeProjectClose", closeResponseMode);
		}
		
		function _getMediaQueryDocument(previewPaneUrl) {
			
			console.log("getting document for media query");
			DocumentManager.getDocumentForPath(projectRoot + prefs.get("mediaQueryFile"))
				.done(function (doc) {
					console.log("retrieved document");

					// close any open inline editors
					closeOpenInlineEditors();

					// enable event handlers for documents
					_addDocumentHandlers();
				
					// Save reference to the new files document.
					mediaQueryDoc = doc;
					MainViewManager.addToWorkingSet(MainViewManager.ACTIVE_PANE, doc.file);

					// refresh media queries from file if they exist
					QueryManager.parseMediaQueries(doc.getText(), doc.getLanguage().getMode());
				
					// now we are ready to create the response UI
					createResponseUI(previewPaneUrl);

					// update toolbar icon to indicate we are in responsive mode
					iconLink.style.backgroundPosition = '0 -26px';
					document.body.classList.add('responsive-mode');

					var command = CommandManager.get(Strings.CMD_RESPONSEMODE_ID);
					command.setChecked(true);
				})
				.fail(function (error) {
					console.error("an unexpedted error occurred trying to get the media query css file", error);
				});
		}
		
		// Ensure we can create a preview pane. Either the currently main
		// document needs to be an HTML doc or use the Live Preview URL if
		// it has been set
		var previewPaneUrl = _getPreviewPaneUrl();
		if (!previewPaneUrl) {
			return;
		}

		projectRoot = ProjectManager.getProjectRoot().fullPath;
		mainView = document.querySelector('.main-view');

		var mediaQueryFilePath = projectRoot + prefs.get("mediaQueryFile");

		// Check if the media-queries css file exists. If it doesn't, then create a
		// new file. If it does, then reload and refresh UI
		FileSystem.resolve(mediaQueryFilePath, function (result, file, fileSystemStats) {
			console.log("resolved path to media query file");

			// create an empty file as one doesn't exist yet                
			if ('NotFound' === result) {
				console.log("creating media query file: " + prefs.get("mediaQueryFile"));

				var mediaQueryFile = FileSystem.getFileForPath(mediaQueryFilePath);

				// create the parent dir if it doesn't yet exist. currently only supports a single node
				console.log("creating parent dir if it doesn't exist");
				var parentDir = FileSystem.getDirectoryForPath(mediaQueryFile.parentPath);
				parentDir.exists(function (error, exists) {
					if (!exists) {
						parentDir.create();
					}
				});

				console.log("writing to media query file to force create");
				mediaQueryFile.write('', function (error, stats) {
					console.log("error: " + error + "; stats: " + stats);
					if (error === null) {
						_getMediaQueryDocument(previewPaneUrl);
					}
				});
				console.log("write completed");

			} else {
				_getMediaQueryDocument(previewPaneUrl);
			}
		});
	}

	/**
	 * Responsible for closing the response mode. This can be invoked in a number of situations
	 *   - when the user clicks on the 'response' icon in the main toolbar on the left
	 *   - when the user switches between projects
	 */
	function closeResponseMode() {

		function _removeDocumentHandlers() {
			
			MainViewManager.off("currentFileChange", handleCurrentFilechange);
	
			DocumentManager
				.off('dirtyFlagChange', handleDirtyFlagChange)
				.off('documentSaved', handleDocumentSaved)
				.off('documentRefreshed', handleDocumentRefreshed);
			
			// if the user switches to a new project, then close the reponse mode
			ProjectManager.off("beforeProjectClose", closeResponseMode);
		}
		
		console.info('closing response mode');

		// close any open inline editors and close responsemode
		closeOpenInlineEditors();

		// remove any document event handlers
		_removeDocumentHandlers();
		
		// close docReloadBar if it is still open
		docReloadBar.close();

		// deselect the current query and queries
		QueryManager.clearQueryMarks();
		
		// remove the #response view
		var element = document.getElementById("response");
		if (element) {

			// ensure inspect mode is off so handlers are removed 
			// but don't update inspect mode menu item
			inspectController.close();

			// remove the response dom element
			element.parentNode.removeChild(element);

			// Manually fire the window resize event to position everything correctly.
			handleWindowResize(null);
			response = null;

			// refresh layout
			WorkspaceManager.recomputeLayout(true);
		}

		// update toolbar icon and menu state to indicate we are leaving responsive mode
		iconLink.style.backgroundPosition = '0 0';
		document.body.classList.remove('responsive-mode');

		var command = CommandManager.get(Strings.CMD_RESPONSEMODE_ID);
		command.setChecked(false);
	}
	
	/** 
	 *  Main entry point of extension that is called when responsive mode is launched.
	 */
	function handleResponseIconClick(e) {

		if (e) { e.stopImmediatePropagation(); }
		
		// Prevent creating UI more than once
		if (document.querySelector('#response')) {
			closeResponseMode();
		} else {
			openResponseMode();
		}
	}

	/** 
	 *  Sets up all of the event listeners we need
	 */
	function setupEventHandlers() {

		// using jquery load event handling as this will trigger when iframe is reloaded
		// instead of only on the first time it is loaded.
		$(frame).on("load", handleFrameLoaded);
		
		window.addEventListener('resize', handleWindowResize, false);
		$(response).on('panelResizeUpdate', handlePanelResize);
	}


	/**
	 * Called when user selects live preview menu item. If the menu item
	 * is enabled then the preview pane will load with the url specified under
	 * File > Project Settings
	 */
	function handleLivePreviewToggle(e) {
		
		if (e) {
			e.stopImmediatePropagation();
		}

		// update the inspect menu state
		var command = CommandManager.get(Strings.CMD_PREVIEWURL_ID);
		command.setChecked(!command.getChecked());
	}
	
	/** 
	 *  Called when the iframe DOM has fully loaded.
	 */
	function handleFrameLoaded(e) {

		if (e) {
			e.stopImmediatePropagation();
		}

		console.log("frame loaded event fired");
		
		// Store a reference to the iframe document.
		frameDOM = document.getElementById("frame").contentWindow.document;
		
		// refresh the dom cache
		DomCache.rebuildCache();
		
		// handle the case if we are using preview url and it does not load correctly
		if (!frameDOM.body.firstElementChild) {
			
			// Configure the twipsy
			var options = {
				placement: "left",
				trigger: "manual",
				autoHideDelay: 5000,
				title: function () {
					return Strings.ERR_PREVURL_NOTLOADED;
				}
			};

			// Show the twipsy with the explanation
			$("#response-icon").twipsy(options).twipsy("show");
			
			return;
		}
		
		frameDOM.body.firstElementChild.style.overflowX = 'hidden';

		// Add an empty style block in the iframe head tag. This is where we
		// will write the CSS changes so they update live in the preview.
		style = frameDOM.head.appendChild(document.createElement('style'));
		style = style.appendChild(document.createTextNode(""));

		inspectController.open();
		
		// update the layout based on vert/horz mode
		var horzCmd = CommandManager.get(Strings.CMD_HORZLAYOUT_ID);
		if (horzCmd.getChecked()) {
			showHorizontalLayout();
		} else {
			showVerticalLayout();
		}
		
		// inject frame with media queries as inline style element
		toolbar.refreshQueryMarkTracks();
		refreshIFrameMediaQueries(false);
	}

	/** 
	 *  Called when the user resizes the brackets window.
	 */
	function handleWindowResize(e) {

		if (e) {
			e.stopImmediatePropagation();
		}

		var w = window.innerWidth;
		var h = window.innerHeight;

		// Get the width and height of the response UI
		var responseWidth = response.offsetWidth;
		var responseHeight = response.offsetHeight;

		toolbar.resize(responseWidth);

		// This gets called if we are in horizontal mode. Since the event can
		// be fired excessively, I use a bitwise operator to eek out some perf.
		if (mode & 1) {
			mainView.style.left = (responseWidth + 15) + 'px';
		} else {
			mainView.style.height = (h - responseHeight - 16) + 'px';
		}
	}

	/** 
	 *  Called when the user resizes the panels using the splitter.
	 */
	function handlePanelResize(e, size) {
  
		// Only refresh codemirror every other call (perf).    
		if (size & 1) {
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;
			cm.refresh();
		}
		
		// Adjust things properly if in horizontal mode.
		if (mode & 1) {
			mainView.style.left = (parseInt(size, 10) + 15) + 'px';

			// resize the toolbar
			toolbar.resize(size);
			
			return;
		}

		// Were in vertical mode so adjust things accordingly.
		mainView.style.height = (window.innerHeight - size - 16) + 'px';
	}

	/** 
	 *  Called when the user chooses a CSS selector from the select box
	 *  that appears in the inline editor.
	 */
	function handleSelectorChange(e) {
		
		var newSelector = e.target.value,
			i,
			len;

		var inlineWidget = EditorManager.getFocusedInlineWidget();
		inlineWidget.currentSelector = newSelector;
		
		// Build the editor contents. 
		// Note: For some reason count is 0 when refreshed but 4 when editor is created
		var editorContents = refreshCodeEditor(QueryManager.getCurrentQueryMark(), cssResults, newSelector);

		// Set the text in the inline editor to our new string.
		var inlineCm = inlineWidget.editor._codeMirror;
		inlineCm.setValue(editorContents.contents);

		// Loop through the existingEdits array and highlight lines appropriately.
		var existingEdits = editorContents.existingEdits;
		for (i = 0, len = existingEdits.length; i < len; i++) {
			inlineCm.removeLineClass(existingEdits[i].line, "background");
			inlineCm.addLineClass(existingEdits[i].line, "background", "pq" + existingEdits[i].query.colorIndex);
		}
	}

	/** 
	 *  This is where we setup and display the inline editor for doing quick edits.
	 *  @params: these 2 get sent when you register as an inline provider. The first
	 *  is the main or host editor and the second is the cursor position.
	 */
	function inlineEditorProvider(hostEditor, pos) {

		// uses the tagInfo from the editor to create adom element in the frame document
		// that needs to be parsed for editing. we don't look up the element as we need
		// more control in what is not included when getting the css rules associated to the
		// element
		function _getFrameElement(frameDom, tagInfo) {

			var element = frameDom.createElement(tagInfo.tagName);

			if (tagInfo.position.tokenType === HTMLUtils.ATTR_NAME || tagInfo.position.tokenType === HTMLUtils.ATTR_VALUE) {
				if (tagInfo.attr.name === "class") {
					// Class selector
					element.className = tagInfo.attr.value.trim();

				} else if (tagInfo.attr.name === "id") {
					// ID selector
					element.id = tagInfo.attr.value.trim();
				}
			}

			return element;
		}

		// Only provide a CSS editor when cursor is in HTML content
		if (hostEditor.getLanguageForSelection().getId() !== "html") {
			return null;
		}
				
		// Only provide CSS editor if the selection is within a single line
		var sel = hostEditor.getSelection();
		if (sel.start.line !== sel.end.line) {
			return null;
		}

		// We are not in responsive mode yet (toolbar icon not selected). Fallback
		// to the default CSS inline editor
		if (!document.querySelector('#response')) {
			return null;
		}
		
		// If there isn't a media query, show the message that a query has not been selected
		if (!QueryManager.getCurrentQueryMark()) {
			hostEditor.displayErrorMessageAtCursor("There have not been any media queries defined.");
			return $.Deferred().promise();
		}
		
		// We are now going to write the string the temporary CSS file so we can display
		// it in the inline editor. A jQuery deffered object is used for async.
		var result = new $.Deferred();
		
		// get code mirror from main editor
		var cm = EditorManager.getCurrentFullEditor()._codeMirror;
        var cursor = cm.getCursor();
        
        // Find out the tag name they were on when they hit Cmd-E. If could not
        // be determined then return so message is displayed to user
        var tag = cm.getTokenAt(cursor).state.htmlState.tagName;
        if (tag ===  null) {
            return null;
        }
        
        // Get a reference to the DOM element in the iframe.
		var domCache = DomCache.getCache();
        var el = domCache.frameDom[tag][domCache.codeDom[tag].indexOf(cursor.line)];
		
		// Set this element to the inlineElement property that is used elsewhere.
		inlineElement = el;

		// Call my utility method that finds all of the CSS rules that are
		// currently set for this element. See the comments in ResponseUtils.js.
		cssResults = ResponseUtils.getAuthorCSSRules(frameDOM, el);
		
		var count = 4,
			i,
			len,
			cq = QueryManager.getCurrentQueryMark();

		// build the editor contents
		// The line count starts at 4 because of the selector, whitespace, etc.  
		// Note: For some reason count is 0 when refreshed but 4 when editor is created
		var editorContents = refreshCodeEditor(cq, cssResults);

		// Create a new inline editor. This is my stripped-down version of the
		// MultiRangeInlineEditor module.
		var inlineEditor = new ResponseInlineEdit();
		inlineEditor.editorNode = el;

		// Load the editor with the CSS we generated.
		inlineEditor.load(hostEditor, 0, count + 2, editorContents.contents);

		// Called when the editor is added to the DOM.
		inlineEditor.onAdded = function () {

			// Get a reference to the codemirror instance of the inline editor.
			var inlineCm = this.editor._codeMirror;

			// Loops through the existingEdits array and highlights the appropriate lines
			// in the inline editor.
			var existingEdits = editorContents.existingEdits;
			for (i = 0, len = existingEdits.length; i < len; i++) {
				inlineCm.removeLineClass(existingEdits[i].line, "background");
				inlineCm.addLineClass(existingEdits[i].line, "background", "pq" + existingEdits[i].query.colorIndex);
			}

			// Sets cursor to the end of line 2 in the inline editor.
			this.editor.setCursorPos(1, 0);

			/* BR: could use inlineEditor change event instead of code mirror in effort to stop using code mirror */
			// Listen for changes in the inline editor.
			inlineCm.on("change", inlineChange);
			inlineEditor.doc.on("change", function (e, instance, change) {
				console.log("inlineEditor change event triggered", e, instance, change);
			});
			
			this.refreshMediaQueryInfo(cq);
			this.refreshSelectorDropdown(cssResults);
			this.$selectorSelect[0].addEventListener('change', handleSelectorChange, false);
		};

		// Called when the inline editor is closed.
		inlineEditor.onClosed = function () {

			// Call parent function first.
			ResponseInlineEdit.prototype.parentClass.onAdded.apply(this, arguments);
		};

		// I had to mod the EditorManager module so it always chooses me.
		result.resolve(inlineEditor);

		return result.promise();
	}

	/**
	 *  refreshes the contents of the inline widget, showing the css rules of the
	 *  current css selector (from dropdown)
	 *
	 *  @params cq              : the current media query that has been selected from slider
	 *  @params res             : the css rules that were retrieved from the selected element in the
	 *                            main editor
	 *  @params currentSelector : the current css selector. If not supplied it will default to
	 *                            first css selector for the current element
	 */
	function refreshCodeEditor(cq, res, currentSelector) {

		currentSelector = currentSelector || res.selectors[0];
		
		// Array to hold information about whether a rule has already been set by this or another query.
		var existingEdits = [],

			// indicates the current line number. setting for 1 as the first line (0) is the selector
			lineNumber = 0,
			
			// used in iterator for properties
			prop,
			index,

			// Here we begin writing the string that we will use to populate the inline editor.
			str = currentSelector + " {\n";

		// Go through all of the returned CSS rules and write to the output string.
		if (res.rules[currentSelector] !== null) {
			for (prop in res.rules[currentSelector]) {

				var pvalue = null;
				lineNumber++;

				// Here we loop through all of the defined media queries to see if this rule
				// has already been set by one of them. This is used to show inheritance.
				var queries = QueryManager.getSortedQueryMarks();
				for (index in queries) {

					var q = queries[index];

					// If the media query (q) has a width greater than the currently selected
					// query and has already set a value for this property, then the current
					// query will inherit that value.
					if (q !== cq && parseInt(q.width, 10) > parseInt(cq.width, 10) &&
							q.selectors[currentSelector]) {

						// Check if it has the property set and if so, add it to the existingEdits
						// array so we can highlight it appropriately. Also stores the value.
						if (q.selectors[currentSelector].rules[prop]) {
							pvalue = q.selectors[currentSelector].rules[prop];
							existingEdits.push({query: q, line: lineNumber});
							pvalue = pvalue.replace(/;/, '');
							break;
						}

					} else if (cq === q && q.selectors[currentSelector]) {
						// Check if the currently selected query has this property already set.
						// If so then we add it to the existingEdits array for highlighting purposes.
						// It also stores the value 'pvalue' so we can use that in the output.

						if (q.selectors[currentSelector].rules[prop]) {
							pvalue = q.selectors[currentSelector].rules[prop];
							existingEdits.push({query: q, line: lineNumber});
							pvalue = pvalue.replace(/;/, '');
							break;
						}
					}
				}

				// If this property hasn't been set by anyone, we use the original value returned.
				if (!pvalue) {
					pvalue = res.rules[currentSelector][prop];
				}

				// Finally we add the CSS rule to the output string.
				str += "\t" + prop + ": " + pvalue.trim() + ";\n";
			}
		} else {
			// no rules so create an empty line
			str += "\t\n";
		}

		// Closing curly brace = we're done!
		str += "}";
		
		return { contents: str, existingEdits: existingEdits, numLines: lineNumber };
	}
	
	/** 
	 *  Called when there is a text change in the inline editor.
	 *
	 *  @params instance    : the codemirror instance,
	 *  @params change      : the change object.
	 */
	function inlineChange(instance, change) {

		console.log("inlineChange", instance, change);
		
		// Make sure that the change is even worth looking at.
		if (change.text.length < 2 && change.from.line !== 0) {

			var currentQuery = QueryManager.getCurrentQueryMark();
			var inlineWidget = EditorManager.getFocusedInlineWidget();

			// Add the changed rule to the current query object.
			currentQuery.addRule(inlineWidget.currentSelector, instance.getLine(change.from.line));

			// If a previous query had this prop set, remove its background highlight.
			instance.removeLineClass(change.from.line, "background");

			// Add the new line highlight with the color of the current query.
			instance.addLineClass(change.from.line, "background", "pq" + currentQuery.colorIndex);

			// Write out the changes to the style block and the media queries CSS file.
			refreshIFrameMediaQueries();
		}

		// Adjust the highlight according to the new CSS value.
		if (inspectController) {
			inspectController.positionDomHighlight(inlineElement);
		}
	}

	/** 
	 *  Function that will update an already opened inline editor. This is called when
	 *  a new query is created or if one of the colored query marks has been clicked.
	 *  NOTE: There is quite a bit of duplicated code here from the inlineEditorProvider function.
	 */
	function updateInlineWidgets() {

		// get the inline widgets for the currently open document
		var hostEditor = EditorManager.getCurrentFullEditor();
		var inlineWidgets = hostEditor.getInlineWidgets();

		// Update the highlight.
		if (inspectController) {
			inspectController.positionDomHighlight(inlineElement);
		}

		var cq = QueryManager.getCurrentQueryMark(),
			i,
			j,
			len;

		for (j = 0; j < inlineWidgets.length; j++) {

			var inlineCodeMirror = inlineWidgets[j].editor._codeMirror;

			// update the background colour of the inline mark
			inlineWidgets[j].refreshMediaQueryInfo(cq);
			
			var existingEdits = [];

/* BR: issue74 - stop using cached editorNode dom element as it is not longer valid if user reloads the iframe for any reason */

			// Refresh rules for current query and loop through.
			cssResults = ResponseUtils.getAuthorCSSRules(frameDOM, inlineWidgets[j].editorNode);
			inlineWidgets[j].refreshSelectorDropdown(cssResults);

			// Build the editor contents.
			// Note: For some reason count is 0 when refreshed but 4 when editor is created
			var editorContents = refreshCodeEditor(cq, cssResults);

			// Set the text in the inline editor to our new string.
			inlineCodeMirror.setValue(editorContents.contents);

			// Loop through the existingEdits array and highlight lines appropriately.
			existingEdits = editorContents.existingEdits;

			for (i = 0, len = existingEdits.length; i < len; i++) {
				inlineCodeMirror.removeLineClass(existingEdits[i].line, "background");
				inlineCodeMirror.addLineClass(existingEdits[i].line, "background", "pq" + existingEdits[i].query.colorIndex);
			}
		}
	}
	
	function buildMenuSystem() {
		
		// Build commands and menu system
		var customMenu = Menus.addMenu(Strings.MENU_MAIN, Strings.MENU_RESPONSE_ID, Menus.AFTER, Menus.AppMenuBar.NAVIGATE_MENU);

		CommandManager.register(Strings.SUBMENU_RESPSONSEMODE, Strings.CMD_RESPONSEMODE_ID, handleResponseIconClick);
		customMenu.addMenuItem(Strings.CMD_RESPONSEMODE_ID, "Shift-Alt-R");

		// Toggle inspect mode.
		CommandManager.register(Strings.SUBMENU_INSPECTMODE, Strings.CMD_INSPECTMODE_ID, inspectController.handleInspectToggle);
		customMenu.addMenuItem(Strings.CMD_INSPECTMODE_ID, "Shift-Alt-I");

		customMenu.addMenuDivider();

		// add menu items to indicate if horizontal or vertical layout should be used for the preview
		// pane
		CommandManager.register(Strings.SUBMENU_HORZLAYOUT, Strings.CMD_HORZLAYOUT_ID, handleHorzLayoutToggle);
		customMenu.addMenuItem(Strings.CMD_HORZLAYOUT_ID, "Shift-Alt-H");

		CommandManager.register(Strings.SUBMENU_VERTLAYOUT, Strings.CMD_VERTLAYOUT_ID, handleVertLayoutToggle);
		customMenu.addMenuItem(Strings.CMD_VERTLAYOUT_ID, "Shift-Alt-V");

		customMenu.addMenuDivider();

		// Add menu item to indicate if live preview url setting should be used for preview pane
		CommandManager.register(Strings.SUBMENU_PREVIEWURL, Strings.CMD_PREVIEWURL_ID, handleLivePreviewToggle);
		customMenu.addMenuItem(Strings.CMD_PREVIEWURL_ID, "Shift-Alt-U");
	}
	

	/** 
	 *  Called whenever the current query changes. It is responsible for updating the inline editors
	 */
	QueryManager.on("currentQueryChanged", function (e, cq) {

		try {
			console.debug("currentQueryChanged event called", cq);
			
			// In horizontal mode the code editor also snaps to the query width to give more space.      
			if (mode === HORIZONTAL) {
				Splitter.updateElement(cq.width);
			}

			// Refresh codemirror
			var cm = EditorManager.getCurrentFullEditor()._codeMirror;
			cm.refresh();

			// update the inline editor with the newly selected query.
			updateInlineWidgets();

			// Calling this function will write the new query to the style block 
			// in the iframe and also to the media-queries.css file.
			refreshIFrameMediaQueries();
			
		} catch (err) {
			console.error("an unexpected exception occurred trying to handle currentQueryChanged event", err);
		}
	});
	
	/** 
	 *  Called when brackets has opened and is ready.
	 */
	AppInit.appReady(function () {
		
		// Here we add the toolbar icon that launches you into responsive mode.
		iconLink = document.createElement('a');
		iconLink.href = "#";
		iconLink.id = "response-icon";

		var iconURL = require.toUrl('./images/toolbar-icon.png');
		iconLink.style.cssText = "content: ''; background: url('" + iconURL + "') 0 0 no-repeat;";

		document.querySelector('#main-toolbar .buttons').appendChild(iconLink);
		iconLink.addEventListener('click', handleResponseIconClick, false);

		docReloadBar = new DocReloadBar();
	});

	modulePath = FileUtils.getNativeModuleDirectoryPath(module);

	// Is there a brackets function for loading non-module scripts?
	// I couldn't find one so I wrote a simple one.
	ResponseUtils.loadExternalScript(modulePath + "/js/TweenMax.min.js", document.head);

	// Load in the main CSS for the responsive UI.
	ExtensionUtils.addLinkedStyleSheet(modulePath + "/css/respond.css");
	
	prefs.definePreference("mediaQueryFile", "string", "css/media-queries.css");
	prefs.definePreference("preferredLayout", "string", "vertical").on("change", function () {
		
		if (prefs.get("preferredLayout").toLowerCase() === "horizontal") {
			handleHorzLayoutToggle();
		} else {
			handleVertLayoutToggle();
		}
	});
	
	prefs.definePreference("useLivePreviewUrl", "boolean", false).on("change", function () {

		var command = CommandManager.get(Strings.CMD_PREVIEWURL_ID);

		// update the live preview url menu state
		if (prefs.get("useLivePreviewUrl")) {
			command.setChecked(true);
		} else {
			command.setChecked(false);
		}
	});

	buildMenuSystem();

	// Register as an inline provider.
	EditorManager.registerInlineEditProvider(inlineEditorProvider, 9);
});
