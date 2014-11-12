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

/* This is eseentially all of the responsive feature stuffed into a single file */

define(function (require, exports, module) {
    "use strict";
    
    /*================  Load needed brackets modules  ================*/   

    var CommandManager = brackets.getModule("command/CommandManager");
    var Commands        = brackets.getModule("command/Commands");
    var Menus = brackets.getModule("command/Menus");
    var DocumentManager = brackets.getModule("document/DocumentManager");
    var MainViewManager = brackets.getModule("view/MainViewManager");
    var NativeFileSystem = brackets.getModule("file/NativeFileSystem").NativeFileSystem;
    var FileUtils = brackets.getModule("file/FileUtils");
    var ProjectManager = brackets.getModule("project/ProjectManager");
    var EditorManager = brackets.getModule("editor/EditorManager");
    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
    var Dialogs = brackets.getModule("widgets/Dialogs");
    var AppInit = brackets.getModule("utils/AppInit");
    var FileSystem = brackets.getModule("filesystem/FileSystem");

    
    /*================  Load my custom modules  ================*/  

    // This is a much lighter-weight version of the MultiRangeInlineTextEditor.
    // Ideally I could would be able to use the InlineTextEditor we can't yet.
    var ResponseInlineEdit = require("ResponseInlineEdit").ResponseInlineEdit;

    // This much lighter-weight version of the Resizer utility
    var Splitter = require("Splitter").Splitter;

    // Set of DOM and CSS utility methods.
    var ResponseUtils = require("ResponseUtils");


    /*================  Define module properties  ================*/  
    
    // Reference to the codemirror instance of the inline editor.
    var inlineCm;

    // Path to this extension.
    var modulePath;

    // Holds the starting top position of the sidebar triangle.
    var triangleOffset;

    // The little arrow in the working set that shows which file is open.
    var triangle;

    // Path to the current open project.
    var projectRoot;

    // Document for the generated media-queries.css file.
    var mediaQueryDoc;

    // I write to this temp document to show in the inline editor.
    var tempCSSDoc;

    // Element whose CSS rules are being show in the inline editor.
    var inlineElement;

    // The range element ruler which you drag to change width.
    var slider;

    // Iframe containing the live HTML preview.
    var frame;

    // The track where the color media query bars are shown.
    var track;

    // The .main-view div in Brackets core.
    var mainView;

    // Main container for the response tools and iFrame.
    var response;

    // Button that switches the layout to horizontal.
    var horzButt;

    // Button that switches the layout to vertical.
    var vertButt;

    // Codemirror instance for the current full editor.
    var cm;

    // Editor in current full editor.
    var mainEditor;

    // Select element allowing user to choose the right selector.
    var selectSelector;

    // Wrapper div for selector select box.

    var selectWrapper;
    
    // + button for adding a new media query.
    var addButt;

    // The 'constant' for vertical mode.
    var VERTICAL = 0;

    // The 'constant' for horizontal mode.
    var HORIZONTAL = 1;

    // The current layout mode.
    var mode = VERTICAL;

    // Document object of iframe.
    var frameDOM;

    // Holds all of the created media query objects.
    var queries = {};

    // Array for sorting the queries.
    var sort = [];

    // Crazy high starting index for query color bars.
    var z = 5000;

    // The currently selected media query.
    var currentQuery;

    // Array of color objects for media query bar gradients.
    var colors = [{
        t: "#91b3fb",
        b: "#5f88d0"
    }, {
        t: "#cdb0fd",
        b: "#b48ee4"
    }, {
        t: "#c2ec5c",
        b: "#a7ca50"
    }, {
        t: "#fdcd6b",
        b: "#dfaf51"
    }, {
        t: "#74ede4",
        b: "#59cfc3"
    }];
    
    // The inspect mode toggle button.
    var inspectButton;

    // Is the inline editor open?
    var isInlineOpen = false;
    
    // Selector for the element in the inline editor.
    var inlineSelector;

    // Editor backing the inline editor.
    var inlineEditor;

    // Div containing tools like layout, inspect, add query.
    var tools;
    
    // Div that provides the dark overlay in inspect mode.
    var highlight;

    // The main Brackets sidebar div.
    var sidebar;


    var cmDOM = {};
    /*    ⬆    */
    /* I use these to map cm lines(top) to frame DOM(below) */
    /*    ⬇    */
    var frDOM = {};

   
    // Is the code currently animating.
    var isAnimating = false;
    
    // Results returned from ResponseUtils.getAuthorCSSRules().
    var cssResults;

    // The current document in the full editor.
    var currentDoc;

    // A style block we will inject into the iframe.
    var style;

    // The selected line of code in the main editor.
    var selected;
    
    // The splitter that allows resizing of the split view.
    var splitter;
    

    /*================  Begin function definitions  ================*/  

    /** 
     *  Main entry point of extension that is called when responsive mode is launched.
     */
    function Response() {

        // Prevent creating UI more than once
        if(document.querySelector('#response')) return;

        modulePath = FileUtils.getNativeModuleDirectoryPath(module);
        projectRoot = ProjectManager.getProjectRoot().fullPath;
        mainEditor = EditorManager.getCurrentFullEditor();
        cm = mainEditor._codeMirror;
        mainView = document.querySelector('.main-view');

        // Is there a brackets function for loading non-module scripts?
        // I couldn't find one so I wrote a simple one.    
        ResponseUtils.loadExternalScript(modulePath + "/js/TweenMax.min.js", document.head);
        ResponseUtils.loadExternalScript(modulePath + "/Query.js", document.head);    

        // Load in the main CSS for the responsive UI.    
        ExtensionUtils.addLinkedStyleSheet(modulePath + "/css/respond.css");

        // Store the current HTML document that we'll be working with.
        currentDoc = DocumentManager.getCurrentDocument();

        // There must be a better way of doing what I did here. Basically I'm
        // opening or creating a file  called media-queries.css. I then add 
        // the file to the working set but immediately switch back and select 
        // the HTML file. All of this was just to help the demo go smoothly.
        FileSystem.getFileForPath(projectRoot + 'media-queries.css').write( '', {}, function() {
            DocumentManager.getDocumentForPath(projectRoot + 'media-queries.css').done(
                function(doc) {

                    // Save reference to the new files document.
                    mediaQueryDoc = doc;
                    MainViewManager.addToWorkingSet( MainViewManager.ACTIVE_PANE, doc.file);

                    // Write a blank document.
                    FileUtils.writeText(mediaQueryDoc.file, '');
                    CommandManager.execute(Commands.CMD_OPEN, {fullPath: currentDoc.file.fullPath});

                    // now we are ready to create the response UI
                    createResponseUI();
                }
            );
        });

        // Since the inline editors require an actual file to read from, here I create
        // a temporary CSS file to write to. The contents of this file populates the inline editor.
        /*
        FileSystem.getFileForPath(modulePath + "/temp_response_file.css").write( "", {}, function(){
            DocumentManager.getDocumentForPath(modulePath + '/temp_response_file.css').done(
                function(doc) {
                    tempCSSDoc = doc;
                    FileUtils.writeText(tempCSSDoc.file, '');
                    CommandManager.execute(Commands.CMD_OPEN, {fullPath: currentDoc.file.fullPath});
                }
            );
        });
        */

    }

    /** 
     *  Builds the UI for responsive mode. Lots of DOM injecting here.
     */
    function createResponseUI() {

        var doc = document;
        doc.body.backgroundColor = "#303030";

        // Get a reference to the triangle in the project panel so we can adjust its top.
        //triangle = document.querySelector(".sidebar-selection-triangle");

        // Get the current triangle top value
        //triangleOffset = triangle.offsetTop;

        // I wrote my own DOM insertion utility to avoid jQuery here. Insanely faster.
        // See the details of this function in the ResponseUtils.js module.
        var domArray = [{tag:"div",attr:{id:"response", class:"quiet-scrollbars"}, parent:-1},
            {tag:"div",attr:{id:"tools"}, parent:0},
            {tag:"a",attr:{id:"inspectButton", href:"#"}, parent:1},
            {tag:"div",attr:{id:"inspectText"}, text:"INSPECT", parent:1},
            {tag:"a",attr:{id:"addButt", href:"#"}, parent:1},
            {tag:"a",attr:{id:"horzButt", href:"#"}, parent:1},
            {tag:"a",attr:{class:"divider"}, parent:1},
            {tag:"a",attr:{class:"divider"}, parent:1},
            {tag:"div",attr:{id:"layoutText"}, text:"LAYOUT", parent:1},
            {tag:"a",attr:{id:"vertButt",class:"vert-active"}, parent:1},
            {tag:"div",attr:{id:"track"}, parent:0},
            {tag:"input",attr:{id:"slider",type:"range",min:"0"}, parent:0}];

        // Call the utility function and get a document fragment back.
        var frag = ResponseUtils.createDOMFragment(domArray);

        // Insert the fragment into the main DOM.
        doc.body.insertBefore(frag, doc.body.firstChild);

        // Get references to all the main UI elements that we need.
        response = document.getElementById("response");
        inspectButton = document.getElementById("inspectButton");
        addButt = document.getElementById("addButt");
        vertButt = document.getElementById("vertButt");
        horzButt = document.getElementById("horzButt");
        vertButt = document.getElementById("vertButt");
        slider = document.getElementById("slider");
        track = document.getElementById("track");

        // This set of DOM elements creates a dialog for when you try to do 
        // quick edit without first creating a media query. Never used in the demo.
        domArray = [{tag:"div",attr:{class:"response-dialog template modal hide"}, parent:-1},
            {tag:"div",attr:{class:"modal-header"}, parent:0},
            {tag:"a",attr:{class:"close", href:"#"}, text:"x", parent:1},
            {tag:"h1",attr:{class:"dialog-title"}, parent:1},
            {tag:"div",attr:{class:"modal-body"}, parent:0},
            {tag:"div",attr:{class:"dialog-message"}, parent:4},
            {tag:"p",attr:{},parent:5},
            {tag:"div",attr:{class:"modal-footer"}, parent:0},
            {tag:"a",attr:{class:"dialog-button btn primary right","data-button-id":"ok"}, text:"Ok", parent:7}];
        
        frag = ResponseUtils.createDOMFragment(domArray);
        doc.body.appendChild(frag);

        // I hide the sidebar in the vertical split mode.
        sidebar = document.getElementById('sidebar');

        // Set the ruler slider to the width of brackets.
        slider.value = slider.max = response.offsetWidth;

        // Here I add the live preview iframe wrapped in a div.
        domArray = [{tag:"div",attr:{id:"fwrap"}, parent:-1},
                    {tag:"iframe",attr:{id:"frame", class:"quiet-scrollbars", name:"frame",
                    src:"file://" + currentDoc.file.fullPath}, parent:0}];

        frag = ResponseUtils.createDOMFragment(domArray);
        response.appendChild(frag);

        // Get a reference to the iframe and also set its width to the slider value.
        frame = doc.getElementById('frame');
        frame.style.width = slider.value + 'px';

        // This is the select box that allows users to choose the a CSS selector
        // when they are in quick edit mode. It is also wrapped in a div element.
        selectSelector = document.createElement('select');
        selectWrapper = document.createElement('div');
        selectWrapper.id = "selectWrapper";
        selectWrapper.appendChild(selectSelector);

        var h = window.innerHeight;

        // Set the initial heights of the panels to 60% response / 40% code editor.
        response.style.height = (h * 0.6) + 'px';
        mainView.style.height = (h - response.offsetHeight - 16) + 'px';

        // Create a vertical splitter to divide the editor and the response UI
        Splitter.makeResizable(response, 'vert', 100, cm);
        splitter = document.querySelector('.vert-splitter');

        // Position the selection triangle
        //triangle.style.top = (response.offsetHeight + triangleOffset + 15) + "px";
        //triangleOffset = triangle.offsetTop - response.offsetHeight;
        
        // Manually fire the window resize event to position everything correctly.
        handleWindowResize(null);

        // Refresh codemirror
        cm.refresh();
     
        setupEventHandlers();
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
    function buildDOMCache() {

        var lines = cm.getValue().split(/\n/);

        for(var i=0; i<lines.length; i++) {
            var tags = lines[i].match(/(?:<)(\w+)(?=\s|>)/g);
            
            if(tags) {
                for(var j=0; j<tags.length; j++) {
                    var tag = tags[j].substr(1);
                    if(cmDOM[tag] == undefined)
                        cmDOM[tag] = [];
                    cmDOM[tag].push(i);
                }
            }  

        }

        for(var tag in cmDOM) {

            if(frDOM[tag] == undefined)
                frDOM[tag] = [];

            var elements = $(frameDOM.body).find(tag);

            for(var i=0, len=elements.length; i<len; i++) {
                frDOM[tag].push(elements[i])
            }

        }
    }

    /** 
     *  Sets up all of the event listeners we need
     */
    function setupEventHandlers() {

        selectSelector.addEventListener('change', handleSelectorChange, false);
        horzButt.addEventListener('click', handleChangeLayout, false);
        vertButt.addEventListener('click', handleChangeLayout, false);
        slider.addEventListener('change', handleSliderChange, false);
        frame.contentWindow.addEventListener('load', handleFrameLoaded, false);
        frame.addEventListener('mouseout', handleFrameMouseOut, false);
        addButt.addEventListener('click', handleAddQuery, false);
        window.addEventListener('resize', handleWindowResize, false);
        $(response).on('panelResizeStart', handlePanelStart);
        $(response).on('panelResizeUpdate', handlePanelResize);
        inspectButton.addEventListener('click', handleInspectToggle, false);

    }

    /** 
     *  Called when the user clicks on one of the editor layout
     *  toggle buttons (either vertical or horizontal)
     */
    function handleChangeLayout(e) {

        e.stopImmediatePropagation();

        // User wants to go into horizontal mode
        if(this.id == 'horzButt' && mode == VERTICAL) {

            mode = HORIZONTAL;

            // Changes the CSS to adjust to the new mode
            vertButt.classList.remove("vert-active");
            horzButt.classList.add("horz-active");
            response.style.cssText = null;
            mainView.style.cssText = null;
            response.classList.add("response-vert");
            mainView.classList.add("main-view-horz");

            // Remove the current panel splitter
            if (splitter != undefined) 
                response.removeChild(splitter);

            // Hide the sidebar in horizontal mode
            /*
            sidebar.style.display = "none";
            document.querySelector(".content").style.left = "0px";           
            var horzSizer = sidebar.parentElement.insertBefore(document.querySelector(".horz-resizer"), sidebar);
            horzSizer.style.left = "0px";
            */

            // Create a new splitter for this mode
            Splitter.makeResizable(response, 'horz', 344, cm);

            splitter = document.querySelector('.horz-splitter');
            splitter.style.right = '-16px';
            
            var w = window.innerWidth;

            // Change to a left/right layout
            response.style.width = (w * 0.5) + 'px';
            mainView.style.left = (response.offsetWidth + 15) + 'px';
            mainView.style.height = '100%';
            slider.max = response.offsetWidth;
            slider.value = response.offsetWidth;
            frame.style.width = slider.value + "px";

            // Refresh codemirror
            cm.refresh();          
        }

        // User wants to go into vertical mode
        else if(this.id == 'vertButt' && mode == HORIZONTAL) {

            // Change the CSS needed for this mode
            vertButt.classList.add("vert-active");
            horzButt.classList.remove("horz-active");
            response.style.cssText = null;
            mainView.style.cssText = null;
            response.classList.remove("response-vert");
            mainView.classList.remove("main-view-horz");

            // Remove the current panel splitter
            if (splitter != undefined) 
                response.removeChild(splitter);

            // Create a new splitter for this mode
            Splitter.makeResizable(response, 'vert', 100, cm);

            splitter = document.querySelector('.vert-splitter');
            mode = VERTICAL;

            var w = window.innerWidth;
            var h = window.innerHeight;

            // Change to a top/bottom layout
            response.style.height = (h * 0.6) + 'px';
            mainView.style.height = (h - response.offsetHeight - 16) + 'px'; 
            slider.max = slider.offsetWidth;
            slider.value = slider.max;
            frame.style.width = slider.value + "px";

            // Refresh codemirror
            cm.refresh();
        }
    }


    /** 
     *  Called when the iframe DOM has fully loaded.
     */
    function handleFrameLoaded(e) {

        // Store a reference to the iframe document.
        frameDOM = this.document;
        frameDOM.body.firstElementChild.style.overflowX = 'hidden';

        // Now we create our DOM mapping cache.
        buildDOMCache();

        // Add an empty style block in the iframe head tag. This is where we
        // will write the CSS changes so they update live in the preview.
        style = frameDOM.head.appendChild(document.createElement('style'));
        style = style.appendChild(document.createTextNode(""));

        // Create the highlight effect div that we use when in inspect mode.
        highlight = document.createElement("div");
        highlight.id = "highlight";
        highlight.style.cssText = "outline: rgba(0, 0, 0, 0.617188) solid 2000px;display:none;-webkit-transition: top 0.2s, left 0.2s, width 0.2s, height 0.2s; -webkit-transition-timing-func: easeOut; position:absolute; width:354px; height:384px; background-color:transparent; top:1420px; z-index:0; left:713px; margin:0; padding:0;pointer-events:none;";

        // Add it to the frame body
        frameDOM.body.appendChild(highlight);

        // Listen for click events on the frame's body
        frameDOM.body.addEventListener('click', handleFrameClick, false);
    }

    /** 
     *  Called when user mouses off the iframe.
     */
    function handleFrameMouseOut(e) {

        // Hide the highlight if the inline editor isn't open. Just a UI tweak.
        if(!isInlineOpen && highlight)
            highlight.style.display = 'none';

    }

    /** 
     *  Called when the user clicks on the + button to add a new query.
     */
    function handleAddQuery(e) {

        var w = slider.value;

        // First check that there isn't already a query for this width.
        if (queries[w] == undefined) {

            // Create a new Query object.
            var q = new Query(w);

            // Set is as the current media query.
            currentQuery = q;

            // Add the new query into the master list.
            queries[w] = q;

            // Add the current width to the sort array.
            sort.push(w);

            // Sort so the largest number is first.
            sort.sort(function(a, b) {
                return a - b
            });

            // Create a new colored mark div and add it to the track.
            var mark = track.insertBefore(document.createElement('div'), track.firstChild);
            mark.className = "mark";
            mark.id = w;

            // Create the label that displays the pixel width.
            var label = mark.appendChild(document.createElement('div'));
            label.className = "wd";
            label.innerText = w + "px";

            // Store a reference to the mark in the query object.
            q.view = mark;

            // Listen for clicks on the mark set this query as the current query.
            mark.addEventListener("click", handleQueryClicked, false);
            
            // This loop goes through all of the created media queries and 
            // essentially redraws all the marks with the correct color and size.        
            for (var i = 0, len = sort.length; i<len; i++) {
                
                var left = 0;
                var w = parseInt(queries[sort[i]].width);
                
                var query = queries[sort[i]];

                query.view.style.width = w + "px";

                // Smaller query widths get higher z-index values so they are visible.
                query.view.style.zIndex = z--;

                // If this is a new query, assign it the next color available.
                if (query.color == undefined) {
                    query.color = colors[sort.length - 1];
                    query.colorIndex = sort.length - 1;
                }
                
                // Calculate the correct left CSS property
                left = (i < 1) ? 0 : sort[i - 1];
                
                // Now finally we can draw the mark by adding the arrows image and the gradient.
                query.view.style.background = "url('file://" + modulePath + "/images/ruler_min.png') " + 
                        left + "px 0px no-repeat, " +
                        "-webkit-gradient(linear, left top, left bottom, from(" + 
                        queries[sort[i]].color.t + "), to(" + 
                        queries[sort[i]].color.b + "))";
            }
        }

        // If the inline editor is open, update it with the newly selected query.
        if(isInlineOpen)
            updateInlineWidget();

        // Calling this function will write the new query to the style block 
        // in the iframe and also to the media-queries.css file.
        refreshMediaQueries();
    }

    /** 
     *  Called when the user clicks on one of the colored query marks in the track.
     */
    function handleQueryClicked(e) {

        var w = parseInt(e.target.id);
        var q = queries[w];

        // Set the clicked query as the current query.
        currentQuery = q;

        // Snap the ruler and iframe to that query.
        slider.value = w;
        frame.style.width = w + "px";
        
        // In horizontal mode the code editor also snaps to the query width to give more space.      
        if(mode == HORIZONTAL) {
            Splitter.updateElement(w);
        }

        // Refresh codemirror
        cm.refresh();

        // If the inline editor is open, update it with the newly selected query.
        if(isInlineOpen)
            updateInlineWidget();

    }

    /** 
     *  Called when the user resizes the brackets window.
     */
    function handleWindowResize(e) {

        if(e)
            e.stopImmediatePropagation();

        var w = window.innerWidth;
        var h = window.innerHeight;

        // Get the width and height of the response UI
        var responseWidth = response.offsetWidth;
        var responseHeight = response.offsetHeight;

        // This gets called if we are in horizontal mode. Since the event can
        // be fired excessively, I use a bitwise operator to eek out some perf.
        if(mode & 1) {
            slider.max = slider.value = responseWidth;
            frame.style.width = responseWidth + 'px';
            mainView.style.left = (responseWidth + 15) + 'px';
            return;
        }

        // This code will only be reached if in vertical mode.
        mainView.style.height = (h - responseHeight - 16) + 'px';
        slider.max = slider.value = w;
        frame.style.width = w + 'px';
       
    }

    /** 
     *  Called when the user resizes the panels using the splitter.
     */
    function handlePanelResize(e, size) {
  
        // Only refresh codemirror every other call (perf).    
        if(size & 1)
            cm.refresh();

        // Adjust things properly if in horizontal mode.
        if (mode & 1) {
            mainView.style.left = (parseInt(size) + 15) + 'px';
            slider.value = slider.max = size;
            frame.style.width = slider.value + "px";
            return;
        } 

        // Adjust this triangle position if the sidebar is open.
        if(sidebar.offsetWidth > 0) {
            triangle.style.top = (size + triangleOffset) + "px";
        }

        // Were in vertical mode so adjust things accordingly.
        mainView.style.height = (window.innerHeight - size - 16) + 'px';

    }

    /** 
     *  Called when the user starts resizing using the splitter.
     */
    function handlePanelStart(e, size) {

        // This is used to adjust the position of project triangle.
        //triangleOffset = triangle.offsetTop - response.offsetHeight;

    }

    /** 
     *  Called when the user clicks on the inspect mode toggle button.
     */
    function handleInspectToggle(e) {

        if(e) e.stopImmediatePropagation();

        // Just set e to be a refence to the inspect button.
        e = inspectButton;

        // If inspect mode is currently on, change the button visuals and
        // also remove any highlighted code lines and the highlight div.
        if(e.classList.contains("inspectButtonOn")) {
            e.classList.remove("inspectButtonOn");
            if(selected) {
                cm.removeLineClass(selected.line, "background");
            }
            highlight.style.display = 'none';
            cm.display.wrapper.removeEventListener('click', handleCodeClick);
            frameDOM.body.removeEventListener('mouseover', handleInspectHover);
            return;
        }

        // Inspect mode is not currently activated so here we change the button
        // visual, show the highlight div, and begin listening to mouse events
        // on both the codemirror editor and the iframe.
        else {
            e.classList.add("inspectButtonOn");
            highlight.style.display = 'block';
            selected = null;
            frameDOM.body.addEventListener('mouseover', handleInspectHover, false);
            cm.display.wrapper.addEventListener('click', handleCodeClick, false);
        }

    }

    /** 
     *  Called when the user clicks on a line of code in the editor while in inspect mode.
     */
    function handleCodeClick(e) {

        e.stopImmediatePropagation();

        // Ignore if the inline editor is open.
        if(isInlineOpen || isAnimating)
            return;

        // Get current cursor location.
        var cur = cm.getCursor();

        var line = cur.line;

        // Get the HTML tag name that the cursor is currently on.
        var tag = cm.getTokenAt(cur).state.htmlState.tagName;
        
        var ind;

        // If there is already a selected line with a highlight, remove the highlight.
        if(selected) {
            cm.removeLineClass(selected.line, "background");
        }

        // Check to see if the editor even contains any tags of this type.
        if(cmDOM[tag]) {
            
            // Find out index position of the tag amongst all of the existing tags of this type.   
            ind = cmDOM[tag].indexOf(line);
            
            // Now find the corrensponding DOM element using the position index.
            // IMPORTANT: If the user adds or changes lines in the HTML editor you will
            // need to rebuild the mapping cache. I never wrote the code for that.
            var el = frDOM[tag][ind];

            // Set the selected line object using the line number and DOM element.
            selected = {el:el, line:line};
            
            // If we found an element and the inline editor isn't open, then proceed.
            if(el && !isInlineOpen) {
                
                // Boolean that tells you if the scroll position of the iframe is currently being animated.
                isAnimating = true;

                // Here we take the color of the current query and use it highlight the code line.
                if(currentQuery) {
                    var cl = "l"+currentQuery.colorIndex.toString();
                    cm.addLineClass(line, "background", cl);
                }

                // If there is no current query, just make the highlight the blue color.
                else {
                    cm.addLineClass(line, "background", "l0");
                }

                // The correct DOM element is now animated into view in the iframe using the
                // TweenMax library. This just animates the scrollTop property of the body.
                TweenMax.to(frameDOM.body, 0.8, {
                    scrollTop: (el.offsetTop - frame.offsetHeight * 0.5) + el.offsetHeight * 0.5,
                        ease: 'Expo.easeOut', 
                        onComplete: function(){
                            isAnimating = false;
                        }
                });

                // Adjust the highlight to show the selected element.
                positionHighlight(el);
            }
        }


    }

    /** 
     *  Called when the user hovers over an element in the iframe while in inspect mode.
     */
    function handleInspectHover(e) {

        e.stopImmediatePropagation();

        // If the inline editor isn't open, position the highlight.
        if(!isInlineOpen)
            positionHighlight(e.target);

    }

    /** 
     *  Called when the user clicks on an element in the iframe while in inspect mode.
     */
    function handleFrameClick(e) {

        e.stopImmediatePropagation();
        e.preventDefault();

        // If inline editor is open, say goodbye.
        if(isInlineOpen || !inspectButton.classList.contains("inspectButtonOn"))
            return;

        var target = e.target;

        // If there is already a selected line of code, remove the background highlight.
        if(selected) {
            cm.removeLineClass(selected.line, "background");
        }

        var tag = target.tagName.toLowerCase();

        // Find out the position index of the this tag in the cache.
        var ind = frDOM[tag].indexOf(target);

        // We'll use the codemirror scroller element to animate our code into view.
        var scroller = cm.display.scroller;
        window.scroller = scroller;
        var editorHeight = (scroller.offsetHeight > 0) ? scroller.offsetHeight : parseInt(scroller.style.height);
        
        // Find out the correct line number from the cache.
        var line = cmDOM[tag][ind];
        
        // Set this as the new selected line.
        selected = {el:target, line:line};
        
        // If there is a current query, use its color to highlight the code line.      
        if(currentQuery) {
            var cl = "l"+currentQuery.colorIndex.toString();
            cm.addLineClass(line, "background", cl);
        }

        // If there's not, just use the blue color.
        else {
            cm.addLineClass(line, "background", "l0");
        }
        
        // Calculate the correct scrollTop value that will make the line be in the center.
        var documentCurPos = cm.charCoords({line:line, ch:0}, "local").bottom;
        var screenCurPos = cm.charCoords({line:line, ch:0}, "page").bottom;
        var pos = documentCurPos - editorHeight * 0.5;

        var info = cm.getScrollInfo();       
        pos = Math.min(Math.max(pos, 0), (info.height - info.clientHeight));
        
        // Use TweenMax to animate our code to the correct position. When the animation is
        // done we position the cursor on the that line inside the correct tag.
        TweenMax.to(scroller, 0.5, {scrollTop: pos, roundProps:'scrollTop', ease: 'Expo.easeOut', onComplete:
            function() {
                cm.setCursor(line, cm.getLine(line).indexOf('<') + 1);
            }
        });

    }

    /** 
     *  Called when the user adjusts the ruler slider.
     */
    function handleSliderChange(e) {

        // Set the width of the frame to match the slider value.
        frame.style.width = slider.value + 'px';
    }

    /** 
     *  Called when the user chooses a CSS selector from the select box
     *  that appears in the inline editor.
     */
    function handleSelectorChange(e) {
        
        var v = e.target.value;

        if (inlineSelector === v) return;
        
        // Change the selector to the new value chosen.
        inlineSelector = v;

        // Build the editor contents. 
        // Note: For some reason count is 0 when refreshed but 4 when editor is created
        var editorContents = refreshCodeEditor(currentQuery, cssResults);

        // Set the text in the inline editor to our new string.
        inlineCm.setValue(editorContents.contents);

        // Loop through the existingEdits array and highlight lines appropriately.
        var existingEdits = editorContents.existingEdits;
        for(var i=0, len=existingEdits.length; i<len; i++) {
            inlineCm.removeLineClass(existingEdits[i].line, "background");
            inlineCm.addLineClass(existingEdits[i].line, "background", "pq" + existingEdits[i].query.colorIndex);
        }
/*
        var w;

        // Finds the absolute position of the opening curly brace on line 1.
        var coords = inlineCm.charCoords({line:0, ch:v.length});

        // This conditional block finds the correct width the select box should
        // be set to based on the number of chars in the new selector text.
        if(mode & 1)
            w = coords.right - response.offsetWidth - 60;
        else
            w = coords.right - sidebar.offsetWidth - 40;

        // Resize the select element to the correct width.
        selectSelector.style.width = w + "px";
*/        
    }

    /** 
     *  Function that positions the highlight over a certain DOM element.
     *  @param: a DOM element you want to highlight.
     *  The animation of the this highlight is all done using CSS transitions.
     */
    function positionHighlight(el) {
        
        // If the element passed is bunk or were not in inspect mode, just leave. 
        if(!el || !inspectButton.classList.contains("inspectButtonOn"))
            return;

        var x = 0;
        var y = 0;

        // Create a temporary reference to the element.
        var tempEl = el;

        // This loop walks up the DOM tree and calculates the correct left
        // and top properties taking into account the element's ancestors.
        while(tempEl) {
            x += tempEl.offsetLeft;
            y += tempEl.offsetTop;
            tempEl = tempEl.offsetParent;
        }

        // Turn on the highlight and position the top and left.
        highlight.style.display = 'block';
        highlight.style.left = x + 'px';
        highlight.style.top = y + 'px';

        // Set the width and height based on either offset values or style properties.
        highlight.style.width = (el.offsetWidth > 0) ? el.offsetWidth + 'px' : el.style.width;
        highlight.style.height = (el.offsetHeight > 0) ? el.offsetHeight + 'px' : el.style.height;
        
    }

    /** 
     *  This is where we setup and display the inline editor for doing quick edits.
     *  @params: these 2 get sent when you register as an inline provider. The first
     *  is the main or host editor and the second is the cursor position.
     */
    function inlineEditorProvider(hostEditor, pos) {
        
        // Only provide a CSS editor when cursor is in HTML content
        if (hostEditor.getLanguageForSelection().getId() !== "html") {
            return null;
        }
                
        // Only provide CSS editor if the selection is within a single line
        var sel = hostEditor.getSelection();
        if (sel.start.line !== sel.end.line) {
            return null;
        }

        // If there isn't a media query, show the dialog and the just bail.
        if(currentQuery == undefined) {
            if(selected)
                cm.removeLineClass(selected.line, "background");
            
            return;
        }
        
        // We are now going to write the string the temporary CSS file so we can display
        // it in the inline editor. A jQuery deffered object is used for async.
        var result = new $.Deferred();
                
        // If there is a selected line of code in the editor, remove the highlight.
        if(selected)
            cm.removeLineClass(selected.line, "background");

        var cursor = cm.getCursor();
        
        // Find out the tag name they were on when they hit Cmd-E. If could not
        // be determined then return so message is displayed to user
        var tag = cm.getTokenAt(cursor).state.htmlState.tagName;
        if (tag ===  null) {
            return null;
        }
        
        // Get a reference to the DOM element in the iframe.
        var el = frDOM[tag][cmDOM[tag].indexOf(cursor.line)];

        // Set this element to the inlineElement property that is used elsewhere.
        inlineElement = el;

        // Call my utility method that finds all of the CSS rules that are
        // currently set for this element. See the comments in ResponseUtils.js.
        cssResults = ResponseUtils.getAuthorCSSRules(frameDOM, el);

        refreshSelectorSelectbox(selectSelector, cssResults);

        // If element has an ID, add it to the selectors and use it as the selector.
        if(el.id) {
            var s = document.createElement('option');
            s.text = "#" + el.id;
            inlineSelector = s.text;
            selectSelector.appendChild(s);
        }

        var count = 4;

        var cq = currentQuery;

        // build the editor contents
        // The line count starts at 4 because of the selector, whitespace, etc.  
        // Note: For some reason count is 0 when refreshed but 4 when editor is created
        var editorContents = refreshCodeEditor(currentQuery, cssResults);

        // Write the string to the temporary CSS file.
        //FileUtils.writeText(tempCSSDoc.file, str).done(function (e) {
            
            // Refresh the files document with the new text.
            //tempCSSDoc.refreshText(str, new Date());

            // Create a new inline editor. This is my stripped-down version of the
            // MultiRangeInlineEditor module.
            inlineEditor = new ResponseInlineEdit();

            // Load the editor with the CSS we generated.
            console.log( 'init load' );
            inlineEditor.load(hostEditor, inlineSelector, 0, count+2, editorContents.contents);

            // Called when the editor is added to the DOM.          
            inlineEditor.onAdded = function() {
                
                console.log("onAdded invoked");

                // Let everyone know the editor is open.
                isInlineOpen = true;

                var eh = document.querySelector(".inlineEditorHolder");
                console.log( eh );

                // Create a new mark that will show at the top of the inline editor
                // with the correct query color to remind the user of what they're changing.
                var mark = document.createElement("div");
                mark.className = "inlinemark";
                
                // Add mark to the inline editor holder div.
                eh.appendChild(mark);

                // Create the pixel width text that is displayed on the mark.
                var wd = document.createElement("div");
                wd.className = "wd";
                wd.appendChild(document.createTextNode(cq.width + "px"));
                mark.appendChild(wd);

                // Add the selector select box. It is positioned absolutely.
                mark.appendChild(selectSelector);

                // Get a reference to the codemirror instance of the inline editor.
                inlineCm = inlineEditor.editor._codeMirror;

                // Since the select box is invisible we still need to set the first line.
                //inlineCm.doc.setLine(0, inlineSelector + " {");
                //inlineCm.doc.replaceRange(inlineSelector + " {", 0);

                // Loops through the existingEdits array and highlights the appropriate lines
                // in the inline editor.
                var existingEdits = editorContents.existingEdits;
                for(var i=0, len=existingEdits.length; i<len; i++) {
                    inlineCm.removeLineClass(existingEdits[i].line, "background");
                    inlineCm.addLineClass(existingEdits[i].line, "background", "pq" + existingEdits[i].query.colorIndex);
                }

                // Sets cursor to the end of line 2 in the inline editor.
                inlineCm.setCursor(1, 100);

                // Caclulates the position right after the selector text so we can resize
                // the selector select box to width of the selector text.
                var coords = inlineCm.charCoords({line:0,ch:inlineSelector.length});
                
                var w;

                // Were in horizontal mode so calculate the width correctly.
                if(mode & 1)
                    w = coords.right - response.offsetWidth - 60;

                // Were in vertical mode so calculate the width accordingly.
                else
                    w = coords.right - sidebar.offsetWidth - 40;

                // Set the width of the selector select box.
                //selectSelector.style.width = w + "px";

                // Listen for changes in the inline editor.
                inlineCm.on("change", inlineChange);

                // Style the inline mark to match the color of the current query.
                mark.style.backgroundImage = "url('file://" + modulePath + "/images/ruler_min.png'), -webkit-gradient(linear, left top, left bottom, from(" + cq.color.t + "), to(" + cq.color.b + "))";
                
                console.log("onAdded finished");
            }
            
            // Called when the inline editor is closed.
            inlineEditor.onClosed = function() {

                console.log("onClosed invoked");
                
                // Call parent function first.
                ResponseInlineEdit.prototype.parentClass.onAdded.apply(this, arguments);
/*
                // Set a bunch of stuff so we know the inline editor is no longer showing.
                selected = null;
                isInlineOpen = false;
                inlineSelector = null;
                highlight.style.display = 'none';
                selectSelector.options.length = 0;
                $(selectSelector).remove();
*/
                console.log("onClosed finished");
            } 

            // I had to mod the EditorManager module so it always chooses me.
            result.resolve(inlineEditor);
        
        //});

        return result.promise();
    }

    /**
     * Called to refresh the contents of the selector drop down in the inline editor
     * @params: the first is a reference to the selector dom element and the second is 
     *          the css rules for the selected html dom element
     */
    function refreshSelectorSelectbox(selectSelector, res) {
        
        var i = 0;

        // Choose the first selector if a selector is not already selected or
        // if the current one is no longer available.
        if (!inlineSelector || res.selectors.indexOf(inlineSelector) == -1)
            inlineSelector = res.selectors[0];
        
        // clear all options from the select box first
        $(selectSelector).empty();
        
        // Loop through the returned CSS selectors and populate the select box.
        while(i < res.selectors.length) {
            var s = selectSelector.appendChild(document.createElement('option'));
            s.text = s.value = res.selectors[i];

            // We will select the first selector in the array as the are sorted based on specificity.
            if (res.selectors[i] === inlineSelector) {
                s.selected = true;
                selectSelector.selectedIndex = i;
            }

            i++;
        }
    }
    
    function refreshCodeEditor(cq, res) {
        
        // Array to hold information about whether a rule has already been set by this or another query.
        var existingEdits = [];
        
        // indicates the current line number. setting for 1 as the first line (0) is the selector
        var lineNumber = 0;
        
        // Here we begin writing the string that we will use to populate the inline editor.
        var str = inlineSelector + " {\n";

        // Go through all of the returned CSS rules and write to the output string.
        for(var prop in res.rules[inlineSelector]) {
            
            var pvalue = undefined;
            lineNumber++;
            
            // Here we loop through all of the defined media queries to see if this rule
            // has already been set by one of them. This is used to show inheritance.
            for(var sel in queries) {

                var q = queries[sel];

                // If the media query (q) has a width greater than the currently selected
                // query and has already set a value for this property, then the current
                // query will inherit that value.
                if(q != cq && parseInt(q.width) > parseInt(cq.width) && 
                    q.selectors[inlineSelector]) {

                    // Check if it has the property set and if so, add it to the existingEdits
                    // array so we can highlight it appropriately. Also stores the value.
                    if(q.selectors[inlineSelector].rules[prop]) {
                       pvalue = q.selectors[inlineSelector].rules[prop];
                       existingEdits.push({query:q, line:lineNumber});
                       pvalue = pvalue.replace(/;/, '');
                       break;
                    }
                } 

                // Check if the currently selected query has this property already set.
                // If so then we add it to the existingEdits array for highlighting purposes.
                // It also stores the value 'pvalue' so we can use that in the output.
                else if(cq == q && q.selectors[inlineSelector]) {

                    if(q.selectors[inlineSelector].rules[prop]) {
                       pvalue = q.selectors[inlineSelector].rules[prop];
                       existingEdits.push({query:q, line:lineNumber});
                       pvalue = pvalue.replace(/;/, '');
                       break;

                    }
                }               
            }

            // If this property hasn't been set by anyone, we use the original value returned.
            if(pvalue == undefined)
                pvalue = res.rules[inlineSelector][prop];

            // Finally we add the CSS rule to the output string.
            str += "\t" + prop + ": " + pvalue.trim() + ";\n";
        }

        // Closing curly brace = we're done!
        str += "}";
        
        return { contents: str, existingEdits: existingEdits, numLines: lineNumber };
    }
    
    /** 
     *  Called when there is a text change in the inline editor.
     *  @params: the first is the codemirror instance, the second is the change object.
     */
    function inlineChange(instance, change) {

        // Make sure that the change is even worth looking at.
        if(change.text.length < 2 && change.from.line != 0) {

            // Add the changed rule to the current query object.
            currentQuery.addRule(inlineSelector, inlineCm.getLine(change.from.line));

            // If a previous query had this prop set, remove its background highlight.
            inlineCm.removeLineClass(change.from.line, "background");

            // Add the new line highlight with the color of the current query.
            inlineCm.addLineClass(change.from.line, "background", "pq" + currentQuery.colorIndex);

            // Write out the changes to the style block and the media queries CSS file.
            refreshMediaQueries();
        }

        // Adjust the highlight according to the new CSS value.
        positionHighlight(inlineElement);

    }

    /** 
     *  Function that will update an already opened inline editor. This is called when
     *  a new query is created or if one of the colored query marks has been clicked.
     *  NOTE: There is quite a bit of duplicated code here from the inlineEditorProvider function.
     */
    function updateInlineWidget() {

        if (!isInlineOpen)
            return;

        // Update the highlight.
        positionHighlight(inlineElement);

        var cq = currentQuery;
        var i = 0;

        // update the background colour of the inline mark
        var mark = document.querySelector(".inlinemark");
        mark.style.backgroundImage = "url('file://" + modulePath + "/images/ruler_min.png'), -webkit-gradient(linear, left top, left bottom, from(" + cq.color.t + "), to(" + cq.color.b + "))";
        
        var wd = document.querySelector(".inlinemark > .wd");
        wd.innerHTML = cq.width + "px";

        // Set the appropriate color for the newly selected query.

        var count = 0;
        var existingEdits = [];

        // Refresh rules for current query and loop through.
        cssResults = ResponseUtils.getAuthorCSSRules(frameDOM, inlineElement);

        // refresh the selector drop down
        refreshSelectorSelectbox(selectSelector, cssResults);

        // Build the editor contents. 
        // Note: For some reason count is 0 when refreshed but 4 when editor is created
        var editorContents = refreshCodeEditor(cq, cssResults);

        // Set the text in the inline editor to our new string.
        inlineCm.setValue(editorContents.contents);

        // Loop through the existingEdits array and highlight lines appropriately.
        var existingEdits = editorContents.existingEdits;

        for(var i=0, len=existingEdits.length; i<len; i++) {
            inlineCm.removeLineClass(existingEdits[i].line, "background");
            inlineCm.addLineClass(existingEdits[i].line, "background", "pq" + existingEdits[i].query.colorIndex);
        }
    }

    /** 
     *  Function that goes through all of the media query data and writes it to the 
     *  style block in the iframe and also to the media-queries.css file.
     */
    function refreshMediaQueries() {
        
        // Defining some vars we'll need.
        var s = "";
        var isFirst = true;
        var i = sort.length;
        var qSort;

        // Loop through the queries and write them to the output string.
        while(i--) {

            // We need to sort the queries so the larger widths are written first
            // in order for inheritance to work properly.
            qSort = queries[sort[i]];

            s += '@media only screen and (max-width:';
            s += qSort.width;
            s += 'px) {\n\n';
            for (var sel in qSort.selectors) {
                s += '\t' + sel + ' {\n';
                for (var k in qSort.selectors[sel].rules) {
                    s += '\t\t' + k + ": " + qSort.selectors[sel].rules[k] + '\n';
                }
                s += '\t}\n\n';
            }
            s += '}\n';
        }       
        
        // Set the style block in the iframe using the output string. 
        style.textContent = s;
        
        // Write the new text to the media-queries.css file.
        FileUtils.writeText(mediaQueryDoc.file, s);
    }

    /** 
     *  Called when brackets has opened and is ready.
     */
    AppInit.appReady(function () {
        var iconURL = require.toUrl('./images/icon.png');
        // Here we add the toolbar icon that launches you into responsive mode.
        var icon = document.createElement('a');
        icon.href = "#";
        icon.className = "responseIcon";
        icon.style.cssText = "margin: 10px 0 5px;content: '';background: url('"+iconURL+"') 0 0 no-repeat;display: inline-block;width: 14px;height: 17px;display: inline-block;";
        document.querySelector('#main-toolbar .buttons').appendChild(icon);
        icon.addEventListener('click', Response, false);
    });

    // There are 2 commands registered. One to go into responsive mode, and one to
    // go in and out of inspect mode.
    var LAUNCH_ID = "response.launch";
    var INSPECT_ID = "response.inspect";

    // Launch into responsive mode.
    CommandManager.register("Responsive Mode", LAUNCH_ID, Response);

    // Toggle inspect mode.
    CommandManager.register("Inspect Mode", INSPECT_ID, function() {
        handleInspectToggle();
    });
    
    // Add the two commands to the File menu.
    var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU); 
    menu.addMenuItem(LAUNCH_ID, "Ctrl-2");
    menu.addMenuItem(INSPECT_ID, "Ctrl-1");

    // Register as an inline provider.
    EditorManager.registerInlineEditProvider(inlineEditorProvider, 9);

});
