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
 * QueryManager.js Module
 * Manages the media queries that have been stored and the media query functions
 * of the preview pane
 */

define(function (require, exports, module) {
    "use strict";

    /*====================  Define constants  =====================*/
    
    var MEDIA_QUERY_REGEX = /@media only screen and \(max-width:[0-9]+px\) {\s*([\.#\w:\(\)\-]+\s*{\s*[\w\s:%;\(\)\-,]*}\s*)*}/g,
        
    /*================ Load needed brackets modules ================*/
        
        CSSUtils                = brackets.getModule("language/CSSUtils"),

    /*================  Load custom modules  ================*/

        Query                   = require("query/Query").Query,
        
    /*================  Define module properties  ================*/

        // Holds all of the created media query objects.
        _queries = {},

        // sorted list of widths, representing each media query.
        _widthSort = [],

        // The currently selected media query.
        _currentQuery;

    /*================  Begin function definitions  ================*/

    /**
     * creates a new Query if one doesn't already exist in the existing set of queries
     */
    function addQueryMark(width) {
    
        // First check that there isn't already a query for this width.
        var query = _queries[width];
        if (!query) {

            // Create a new Query object and add to master list
            query = new Query(width, _widthSort.length);
            _queries[width] = query;

            // Add the current width to the sort array.
            // Sort so the smallest number is first.
            _widthSort.push(width);
            _widthSort.sort(function (a, b) {
                return a - b;
            });
        }
        
        return query;
    }

    /**
     * returns the query mark for the supplied width
     */
    function getQueryMark(width) {
        return _queries[width];
    }

    /**
     * returns the list of queries, sorted by width
     */
    function getSortedQueryMarks() {

        var sortedList = [],
            i;

        for (i = 0; i < _widthSort.length; i++) {
            sortedList.push(_queries[_widthSort[i]]);
        }

        return sortedList;
    }

    /**
     * sets the current query mark to indicate which query is currently
     * being editted
     */
    function setCurrentQueryMark(queryMark) {
        _currentQuery = queryMark;
    }

    /**
     * gets the current query mark that is being editted
     */
    function getCurrentQueryMark() {
        return _currentQuery;
    }

    /**
     * clears the query marks
     */
    function clearQueryMarks() {
        _queries = {};
        _widthSort = [];
        _currentQuery = null;
    }

    /**
     * parses the text from a media queries css files and stores Query objects
     */
    function parseMediaQueries(mediaQueryText, languageMode) {

        var i;

        // break the css file into media queries. assumption is that the output for 
        // each media query starts with "@media only screen and (max-width:###px) {"
        var mediaQueries = mediaQueryText.match(MEDIA_QUERY_REGEX);

        //reset master query list 
        _queries = {};
        _widthSort = [];

        
        /*
         * Iterates through the list of supplied selectors and updates the 
         * queryMark with the selector and the list of rules associated to 
         * the selector
         */
        function _addRulesToMediaQuery(queryMark, mediaQuery, selectors) {
            
            var i, j;
            
            if (selectors !== null && selectors.length > 0) {
                for (i = 0; i < selectors.length; i++) {
                    var escapedSelector = selectors[i].selector.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
                    var ruleListRegex = new RegExp(escapedSelector + "\\s+{([\\s\\w\\d:;,%\-\(\)]*)}", "g");
                    
                    var matches = ruleListRegex.exec(mediaQuery);
                    if (matches) {
                        var ruleList = matches[1].split(';');
                        // doing length - 1 here as the last item in the split array will be an empty string
                        // assumption is that the last char in rule list is a ;.
                        // NOTE: Is it possible for the last rule not to have a ; ???? need better logic if this valid
                        for (j = 0; j < ruleList.length - 1; j++) {
                            queryMark.addRule(selectors[i].selector, ruleList[j].trim() + ";");
                        }
                    }
                }
            }
        }
        
        if (mediaQueries && mediaQueries.length > 0) {
            for (i = 0; i < mediaQueries.length; i++) {

                // get the width for the current media query
                var matches = /max-width:([0-9]+)px/g.exec(mediaQueries[i]);
                var width = matches[1];

                // create a query and add to list
                var queryMark = addQueryMark(width);

                // extract all the selectors from the current media query
                var selectors = CSSUtils.extractAllSelectors(mediaQueries[i], languageMode);

                // add the rules associated to each selector to the queryMark
                _addRulesToMediaQuery(queryMark, mediaQueries[i], selectors);
            }
        }
        
    }

    // Export the functions.
    exports.parseMediaQueries = parseMediaQueries;
    exports.addQueryMark = addQueryMark;
    exports.getQueryMark = getQueryMark;
    exports.getSortedQueryMarks = getSortedQueryMarks;
    exports.getCurrentQueryMark = getCurrentQueryMark;
    exports.setCurrentQueryMark = setCurrentQueryMark;
    exports.clearQueryMarks = clearQueryMarks;
});
