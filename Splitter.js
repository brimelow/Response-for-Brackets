
/*
 * IMPORTANT NOTE: this was meant to be a lightweight version of the Resizer utility
 * but I never really got a chance to work on it much. The main difference is that I
 * I got rid of the requestAnimationFrame because it was resizing very choppy.
 * Again I wanted to remove all the jQuery but i ran out of time. Will do it soon.
 */

define(function (require, exports, module) {
    "use strict";

    var DIRECTION_VERTICAL = "vert";
    var DIRECTION_HORIZONTAL = "horz";
    
    var POSITION_TOP = "top";
    var POSITION_BOTTOM = "bottom";
    var POSITION_LEFT = "left";
    var POSITION_RIGHT = "right";

    function Splitter() {

    }

    Splitter.makeResizable = function(element, direction, position, minSize, collapsible, cm) {
        
        var $resizer            = $('<div class="' + direction + '-splitter"></div>'),
            $element            = $(element),
            $resizableElement   = $($element.find(".resizable-content:first")[0]),
            $body               = $(window.document.body),
            elementID           = $element.attr("id"),
            animationRequest    = null,
            directionProperty   = direction === DIRECTION_HORIZONTAL ? "clientX" : "clientY",
            directionIncrement  = (position === POSITION_TOP || position === POSITION_LEFT) ? 1 : -1,
            elementSizeFunction = direction === DIRECTION_HORIZONTAL ? $element.width : $element.height,
            resizerCSSPosition  = direction === DIRECTION_HORIZONTAL ? "left" : "top",
            contentSizeFunction = direction === DIRECTION_HORIZONTAL ? $resizableElement.width : $resizableElement.height;
		
        minSize = minSize;
        collapsible = true;
        
        $element.prepend($resizer);

        var lastSize = 0;
        var visible = true;

        Splitter.updateElement = function(size) {
            resizeElement(size, size);
            $element.trigger("panelResizeUpdate", size);
        }
      
        function resizeElement(elementSize, contentSize) {
           
            elementSizeFunction.apply($element, [elementSize]);
            
            if ($resizableElement.length) {
                contentSizeFunction.apply($resizableElement, [contentSize]);
            }
        }

        function toggle(element) {

           if (visible) {
                hide();
                visible = false;
            } else {
                show();
                visible = true;
            }

            
        }
        
        function show() {
            var elementOffset   = $element.offset(),
                elementSize     = elementSizeFunction.apply($element),
                contentSize     = contentSizeFunction.apply($resizableElement),
                resizerSize     = elementSizeFunction.apply($resizer);
            
            
            resizeElement(lastSize, lastSize);
            
          

            $element.trigger("panelResizeUpdate", [lastSize]);
        }
            

        function hide() {
            
            var size;

            if(direction == "vert") {
                lastSize = $element.height();
                size = window.innerHeight - 15;
            }
            else {
                console.log("in horz");
                lastSize = $element.width();
                size = window.innerWidth - 15;
            }
           
            $element.trigger("panelResizeUpdate", [size]);

            resizeElement(size, size);
            
        }
        
                      
        
        $resizer.on("mousedown", function (e) {
            var $resizeShield   = $("<div class='resizing-container " + direction + "-resizing' />"),
                startPosition   = e[directionProperty],
                startSize       = (visible) ? elementSizeFunction.apply($element) : 0,
                newSize         = startSize,
                previousSize    = startSize,
                baseSize        = 0,
                isMouseDown     = true,
                resizeStarted   = false;
            
            $body.append($resizeShield);
         
            function doRedraw() {
                // only run this if the mouse is down so we don't constantly loop even 
                // after we're done resizing.
                if (!isMouseDown) {
                    return;
                }
                
                // Check for real size changes to avoid unnecessary resizing and events
                if (newSize !== previousSize) {
                    previousSize = newSize;
                    
                    if (visible) {
                       

                        // Trigger resizeStarted just before the first successful resize update
                        if (!resizeStarted) {
                            resizeStarted = true;
                            $element.trigger("panelResizeStart", newSize);
                        }
                        
                        // Resize the main element to the new size. If there is a content element, 
                        // its size is the new size minus the size of the non-resizable elements
                        resizeElement(newSize, (newSize - baseSize));
                        
                        $element.trigger("panelResizeUpdate", [newSize]);
                    }
                        
                    // Trigger resizeStarted after expanding the element if it was previously collapsed
                    if (!resizeStarted) {
                        resizeStarted = true;
                        $element.trigger("panelResizeStart", newSize);
                    }   
                }
            }
            
            function onMouseMove(e) {
                // calculate newSize adding to startSize the difference
                // between starting and current position, capped at minSize
                newSize = Math.max(startSize + directionIncrement * (startPosition - e[directionProperty]), minSize);
                e.preventDefault();
                
                doRedraw();
            }
            
            $(window.document).on("mousemove", onMouseMove);
            
            // If the element is marked as collapsible, check for double click
            // to toggle the element visibility
            if (collapsible) {
                $resizeShield.on("mousedown", function (e) {
                    $(window.document).off("mousemove", onMouseMove);
                    $resizeShield.off("mousedown");
                    $resizeShield.remove();
                    animationRequest = null;
                    toggle($element);
                });
            }
            
            function endResize(e) {
                if (isMouseDown) {
                    
                    var elementSize	= elementSizeFunction.apply($element);

                    isMouseDown = false;
                    
                    if (resizeStarted) {
                        $element.trigger("panelResizeEnd", [elementSize]);
                        cm.refresh();
                    }
                    
                    // We wait 300ms to remove the resizer container to capture a mousedown
                    // on the container that would account for double click
                    window.setTimeout(function () {
                        $(window.document).off("mousemove", onMouseMove);
                        $resizeShield.off("mousedown");
                        $resizeShield.remove();
                        animationRequest = null;
                    }, 300);
                }
            }
            
            $(window.document).on("mouseup", endResize);
            
            e.preventDefault();
        });
		
    }
    
    exports.Splitter = Splitter;

});