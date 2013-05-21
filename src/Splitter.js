
/*
 * IMPORTANT NOTE: this was meant to be a lightweight version of the Resizer utility
 * but I never really got a chance to work on it much. The main difference is that I
 * I got rid of the requestAnimationFrame because it was resizing very choppy.
 * Again I wanted to remove all the jQuery but i ran out of time. Will do it soon.
 */

define(function (require, exports, module) {
    "use strict";

    var EditorManager = brackets.getModule("editor/EditorManager");

    function Splitter() {

    }

    /*
     * We call this static method to create a new splitter for either layout mode.
     * @param: [1] element to resize, [2] "horz" or "vert", [3] min element size
     */
    Splitter.makeResizable = function(el, moad, min) {

        // Set some vars
        var minSize = min;
        var lastSize = 0;
        var mode = moad;
        var element = el;
        var collapsed = false;

        // Create the actual splitter div and insert as the first child of element
        var splitter = document.createElement("div");
        splitter.classList.add(mode + "-splitter");
        element.insertBefore(splitter, element.firstChild);

        // You can call this function manually trigger a resize
        Splitter.updateElement = function(size) {
            resizeElement(size);
        }
      
        // This where the actual resizing happens to the element
        // @param: [1] new size for the element
        function resizeElement(elementSize) {   

            // Are we in horizontal mode?        
            if(/horz/.test(mode)) {
                element.style.width = elementSize + "px";
            }

            // Nope so I guess were in vertical mode
            else {
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
            if(collapsed) {
                resizeElement(lastSize);
                collapsed = false;
            }

            // Here we collapse the panel and store its current size for when
            // we uncollapse. The -15 keeps the actual splitter div visible
            else {
                if(/vert/.test(mode)) {
                    lastSize = parseInt(element.style.height);
                    size = window.innerHeight - 15;
                    element.style.height = size + "px";
                }
                else {
                    lastSize = parseInt(element.style.width);
                    size = window.innerWidth - 15;
                    element.style.width = size + "px";
                }

                collapsed = true;
                $(element).trigger("panelResizeUpdate", size);
            }
        }
        
        // Listen for a mousedown on the spitter
        splitter.addEventListener("mousedown", function(e) {
            
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
            resizeShield.addEventListener("mousemove", function(e) {

                // No mouse down? Goodbye.
                if (!isMouseDown) {
                    return;
                }

                // Calculate the new size based on the current display mode
                if(/vert/.test(mode)) {
                    newSize = Math.max(startSize - 1 * (startPosition - e.clientY), minSize);
                }
                else {
                    newSize = Math.max(startSize - 1 * (startPosition - e.clientX), minSize);
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
                EditorManager.resizeEditor(); 
            });
            
            // You can double-click on the splitter to collapse it. Here we
            // are listneing for a mouse down on the resizeShield. On line
            // 170 we create a setTimeout of 300ms before destroying the shield.
            // This gives you enough time to mouse down on it and here we are.
            resizeShield.addEventListener("mousedown", function(e) {
                
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
            document.addEventListener("mouseup", function(e) {
                if (isMouseDown) {
                    
                    isMouseDown = false;
                    
                    window.setTimeout(function () {
                        resizeShield.removeEventListener("mousemove");
                        resizeShield.removeEventListener("mousedown");
                        if(resizeShield.parentNode)
                            document.body.removeChild(resizeShield);
                    }, 300);

                }
            });
                   
            e.preventDefault();
        });
		
    }
    
    // Make it public
    exports.Splitter = Splitter;
});