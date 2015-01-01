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

/*
 * IMPORTANT NOTE: this was meant to be a lightweight version of the Resizer utility
 * but I never really got a chance to work on it much. The main difference is that I
 * I got rid of the requestAnimationFrame because it was resizing very choppy.
 * Again I wanted to remove all the jQuery but i ran out of time. Will do it soon.
 */

define(function (require, exports, module) {
    "use strict";

    var WorkspaceManager        = brackets.getModule("view/WorkspaceManager");

    function Splitter() {

    }

    /*
     * We call this static method to create a new splitter for either layout mode.
     * @param: [1] element to resize, [2] "horz" or "vert", [3] min element size
     */
    Splitter.makeResizable = function (el, moad, min) {

        // Set some vars
        var minSize = min,
            lastSize = 0,
            mode = moad,
            element = el,
            collapsed = false;

        // Create the actual splitter div and insert as the first child of element
        var splitter = document.createElement("div");
        splitter.classList.add(mode + "-splitter");
        element.insertBefore(splitter, element.firstChild);

        // You can call this function manually trigger a resize
        Splitter.updateElement = function (size) {
            resizeElement(size);
        };
      
        // This where the actual resizing happens to the element
        // @param: [1] new size for the element
        function resizeElement(elementSize) {

            // Are we in horizontal mode?        
            if (/horz/.test(mode)) {
                element.style.width = elementSize + "px";
            } else {
                // Nope so I guess were in vertical mode
                element.style.height = elementSize + "px";
            }

            // Trigger an event that we listen for to adjust UI elements
            $(element).trigger("panelResizeUpdate", elementSize);
        }

        // The panels are collapsible so you can call this function
        // to toggle between collapsed and not collapsed
        function toggle() {

            var size;

            // If it's collapsed, uncollapse it back to its previous size
            if (collapsed) {
                resizeElement(lastSize);
                collapsed = false;
                
            } else {
                // Here we collapse the panel and store its current size for when
                // we uncollapse. The -15 keeps the actual splitter div visible
                if (/vert/.test(mode)) {
                    lastSize = parseInt(element.style.height, 10);
                    size = window.innerHeight - 15;
                    element.style.height = size + "px";

                } else {
                    lastSize = parseInt(element.style.width, 10);
                    size = window.innerWidth - 15;
                    element.style.width = size + "px";
                }

                collapsed = true;
                $(element).trigger("panelResizeUpdate", size);
            }
        }
        
        // Listen for a mousedown on the spitter
        splitter.addEventListener("mousedown", function (e) {
            
            // Calculate the current values of the mouse and the size of the
            // element based on which mode we are currently in
            var startPosition = (/vert/.test(mode)) ? e.clientY : e.clientX;
            var startSize = (/vert/.test(mode)) ? element.offsetHeight : element.offsetWidth;
            var newSize = startSize;
            var previousSize = startSize;
            var isMouseDown = true;
            var resizeStarted = false;

            // The resizeShield is a div that covers the entire application with 
            // a transparent hit area to get consistent mouse move events
            var resizeShield = document.createElement("div");
            resizeShield.className = "resizing-container " + mode + "-resizing";

            document.body.appendChild(resizeShield);
            
            // Listen for mouse move events on the resizeShield
            resizeShield.addEventListener("mousemove", function (e) {

                // No mouse down? Goodbye.
                if (!isMouseDown) {
                    return;
                }

                // Calculate the new size based on the current display mode
                if (/vert/.test(mode)) {
                    newSize = Math.max(startSize - (startPosition - e.clientY), minSize);
                } else {
                    newSize = Math.max(startSize - (startPosition - e.clientX), minSize);
                }

                $(element).trigger("panelResizeStart", newSize);

                // Make sure there is a difference
                if (newSize !== previousSize) {
                    previousSize = newSize;

                    // Trigger the resize start event
                    if (!resizeStarted) {
                        resizeStarted = true;
                        $(element).trigger("panelResizeStart", newSize);
                    }
                    
                    // Resize the element with the new value  
                    resizeElement(newSize);
                    $(element).trigger("panelResizeUpdate", newSize);
                }

                // Make sure the editor is resized properly
                WorkspaceManager.recomputeLayout();
            });
            
            // You can double-click on the splitter to collapse it. Here we
            // are listneing for a mouse down on the resizeShield. On line
            // 170 we create a setTimeout of 300ms before destroying the shield.
            // This gives you enough time to mouse down on it and here we are.
            resizeShield.addEventListener("mousedown", function (e) {
                
                // Toggle the panel
                toggle();

                // Do some cleaning
                resizeShield.removeEventListener("mousemove");
                resizeShield.removeEventListener("mousedown");
                document.body.removeChild(resizeShield);
            });

            // Here we listen for a mouseup on the main document element. If
            // that happens we then create the timeout allowing you to click
            // on the resizeShield simulating a double click
            document.addEventListener("mouseup", function (e) {
                if (isMouseDown) {
                    
                    isMouseDown = false;
                    
                    window.setTimeout(function () {
                        resizeShield.removeEventListener("mousemove");
                        resizeShield.removeEventListener("mousedown");
                        if (resizeShield.parentNode) {
                            document.body.removeChild(resizeShield);
                        }
                    }, 300);

                }
            });
                   
            e.preventDefault();
        });
		
    };
    
    // Make it public
    exports.Splitter = Splitter;
});
