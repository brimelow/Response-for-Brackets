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

/**
 * ResponseUtils.js Module
 * Contains a set of DOM and CSS helper functions that the extension uses.
 */

define(function (require, exports, module) {
    "use strict";

    // DOM utility methods
    //----------------------------------------------------------------//

     /**
     * Takes an array of objects and converts them into DOM elements 
     * attached to a document fragment. Insanely faster than jQuery.append().
     *
     * Example: {tag:"div",attr:{id:"layoutText"}, text:"LAYOUT", parent:1}
     *
     * Pass -1 as parent to attach directly to document fragment.
     */
    function createDOMFragment(domArray) {
        var frag = document.createDocumentFragment();
        var elements = [];

        // Loops through the DOM objects and creates them.
        while(domArray.length) {
            var el = domArray.shift();
            var element = document.createElement(el.tag);

            // Goes through and sets any attributes for this element.
            for(var a in el.attr) {
                element.setAttribute(a, el.attr[a]);
            }

            // If there is text, create and add a text node.
            if(el.text) {
                element.appendChild(document.createTextNode(el.text));
            }

            elements.push(element);
            
            // Append container element to the fragment.
            if(el.parent == -1)
                frag.appendChild(element);

            // Otherwise append it to its correct parent.
            else
                elements[el.parent].appendChild(element);
        }

        // Return the document fragment.
        return frag;
    }

    /**
     * Simple function that adds an external JS file to the document head.
     * @params: [1] URL of external script, [2] head element to append it to.
     */
    function loadExternalScript(url, head) {
        var script = document.createElement("script");
        script.src = url;
        head.appendChild(script);
    }


    // CSS utility methods
    //------------------------------------------------------------------//

    /**
     *  Simple return object that stores the CSS results generated with the functions below. 
     */
    function CSSResponse() {

        // Array of the selectors.
        this.selectors = [];

        // Object list of the rules for each selector.
        this.rules = {};
    }

    /**
     *  Function that parses a cssText string and extracts all of the 
     *  individual CSS rules inside of it.
     *  @param: a string of CSS text.
     */
    function parseCSSRules(css) {

        // Parse out the rules from the text.
        var rules = css.match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g);

        var i = rules.length-1;
        var lines = [];

        // Loop through the rules and get the property names and values.
        while(i--) {
            var match = rules[i].match(/\s*([^:\s]*)\s*:\s*(.*?)\s*(?:! (important))?;?$/);
            
            if(match) {

                // Checks if the match has 3 elements.
                if(match[2]) {

                    // Push result in to the lines array.
                    lines.push(match);
                }
            }      
        }

        // Return the lines array.
        return lines;
    }

    /**
     *  Function that finds all of the CSS rules that match a certain 
     *  CSS selector and return the results as a CSSResponse object.
     *  @param: [1] document to search, [2] CSS selector string.
     */
    function getAuthorCSSBySelector(doc, sel) {
        
        // Get the DOM element matching this selector.
        var el = doc.querySelector(sel);

        if(el) {

            // Use the native getMatchedCSSRules function to get
            // all of the matching CSS rules for this element.
            var rules = doc.defaultView.getMatchedCSSRules(el, '', false);

            // Create a new return object.
            var res = new CSSResponse();

            // Add the selector parameter to the return object.
            res.selectors.push(sel);

            // Check if we have any results.
            if(rules.length > 0) {

                // Loop through each of the returned rules.
                for(var i=rules.length-1; i>-1; i--) {

                    // If this rule's selector matches the one we want, then continue.
                    if(rules[i].selectorText == sel) {

                        // Take the cssText property and use out helper function to parse it.
                        var lines = parseCSSRules(rules[i].style.cssText);

                        // Get a reference to the style declaration for this rule.
                        var declaration = rules[i].style;

                        // Loop through each of the returned CSS lines.
                        for(var j=0, len=lines.length; j<len; j++) {
                            
                            // If the current line has a property value. 
                            if(lines[j][1]) {

                                // See if we can shorten things by checking if there is a 
                                // shorthand version of this rule (i.e. margin:20px vs margin-top:20px etc.)
                                /*if(declaration.getPropertyShorthand(lines[j][1]) != null) {

                                    // Get the shorthand property name.
                                    var pname = declaration.getPropertyShorthand(lines[j][1]);

                                    // Store the value for this property.
                                    res.rules[pname] = declaration.getPropertyValue(pname);
                                }

                                else {*/
                                    // Store the property name and value returned to us.
                                    res.rules[lines[j][1]] = lines[j][2];
                                //}

                            }
                        }
                    }
                }
            }

            // Return the CSSResults instance.
            return res;
        }
    }

    /**
     *  Function that finds all of the CSS rules that are currently set and 
     *  affecting a particular DOM element and returns the results.
     *  @param: [1] document object to search, [2] affected DOM element.
     */
    function getAuthorCSSRules(doc, el) {
        
        // Use the native method for finding matching CSS rules.
        var rules = doc.defaultView.getMatchedCSSRules(el, '', false);

        // Create a new return object.
        var res = new CSSResponse();

        if(rules != null && rules.length > 0) {
            // Loop thorugh the returned CSS rule objects.
            for(var i=rules.length-1; i>-1; i--) {

                // Use the helper function above to parse out all the rules
                // from the cssText string.
                var lines = parseCSSRules(rules[i].style.cssText);
                var declaration = rules[i].style;

                // Loop through the retuned lines of CSS.
                var rulelist = {};
                for(var j=0, len=lines.length; j<len; j++) {
                    
                    // There is a property name proceed;  
                    if(lines[j][1]) {
                        
                        // See if we can shorten things by checking if there is a 
                        // shorthand version of this rule (i.e. margin:20px vs margin-top:20px etc.)
                        /*if(declaration.getPropertyShorthand(lines[j][1]) != null) {

                            // Get the shorthand property name.
                            var pname = declaration.getPropertyShorthand(lines[j][1]);

                            // Store the value for this property.
                            res.rules[pname] = declaration.getPropertyValue(pname);
                        }

                        else {

                            // No shortand available so just use the returned value.*/
                            rulelist[lines[j][1]] = lines[j][2];
                        //}

                    }
                }

                var selector = rules[i].selectorText;
                
                // If the return object doesn't have this selector set yet, add it 
                // to the selectors array.
                if (res.selectors.indexOf(selector) == -1) {
                    res.selectors.push(selector);
                    res.rules[selector] = rulelist;
                } else {
                    res.rules[selector] = $.extend(res.rules[selector], rulelist);
                }

                
            }
        } else {
            // create empty CSS rules for each class or id on the element
            if (el.id.length > 0) {
                res.selectors.push('#' + el.id);
                res.rules['#' + el.id] = {};
            }

            for (var i = 0; i < el.classList.length; i++) {
                res.selectors.push('.' + el.classList[i]);
                res.rules['.' + el.classList[i]] = {};
            }
            
            // and id or class has not been defined...adding the tag name instead
            if (res.selectors.length == 0) {
                res.selectors.push(el.tagName.toLowerCase());
                res.rules[el.tagName.toLowerCase()] = {};                
            }
        }

        // Return the CSSResults instance.
        return res;
    }

    // Export the functions.
    exports.getAuthorCSSRules = getAuthorCSSRules;
    exports.getAuthorCSSBySelector = getAuthorCSSBySelector;
    exports.createDOMFragment = createDOMFragment;
    exports.loadExternalScript = loadExternalScript;

});
