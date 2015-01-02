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
 * IMPORTANT NOTE: this is essentially a bare-bones version of the MultiRangeInlineEditor.
 * Most of the jQuery has been removed and it basically is just a light wrapper on the
 * InlineTextEditor module, which is currently not completed.
 */

define(function (require, exports, module) {
    "use strict";
    
    // This is essentially a sub-class on the InlineTextEditor
    var InlineTextEditor            = brackets.getModule("editor/InlineTextEditor").InlineTextEditor,
        DocumentModule              = brackets.getModule("document/Document"),
        DocumentManager             = brackets.getModule("document/DocumentManager"),
        InMemoryFile                = brackets.getModule("document/InMemoryFile"),
        FileSystem                  = brackets.getModule("filesystem/FileSystem"),
        FileUtils                   = brackets.getModule("file/FileUtils"),

        modulePath                  = FileUtils.getNativeModuleDirectoryPath(module);

    function ResponseInlineEdit() {
        InlineTextEditor.call(this);
        //this.doc;
        var self = this;
        $(DocumentManager).on("dirtyFlagChange", function (event, doc) {
            if (doc === self.doc) {
                // Force dirty flag false so doc is not shown in Working Set.
                doc.isDirty = false;
            }
        });
    }

    ResponseInlineEdit.prototype = Object.create(InlineTextEditor.prototype);
    ResponseInlineEdit.prototype.constructor = ResponseInlineEdit;
    ResponseInlineEdit.prototype.parentClass = InlineTextEditor.prototype;

    ResponseInlineEdit.prototype.$inlineMark = null;
    ResponseInlineEdit.prototype.$wd = null;
    ResponseInlineEdit.prototype.$selectorSelect = null;
    
    ResponseInlineEdit.prototype.currentSelector = null;
    
    /**
     * I changed the arguments sent to load to make it more compatible with the extension.
     * @param: [1] main editor, [2] start line number
     *          the temp CSS file, [4] display up to this end line, [5] the tempCSSDoc 
     **/
    ResponseInlineEdit.prototype.load = function (hostEditor, start, end, str) {
        ResponseInlineEdit.prototype.parentClass.load.apply(this, arguments);
        
        // Create the header for the inline widget.
        this.$inlineMark = $("<div/>").addClass("inlinemark").appendTo(this.$header);
        this.$wd = $("<div/>").addClass("wd").appendTo(this.$inlineMark);
        this.$selectorSelect = $("<select/>").appendTo(this.$header);
    
        this.doc = new DocumentModule.Document((new InMemoryFile('temp-response.css', FileSystem)), (new Date()), str);

        // The magic line that creates and displays the inline editor
        this.setInlineContent(this.doc, start, end);
        this.editor.focus();
        this.editor.refresh();

        // Size the inline editor to its contents
        this.sizeInlineWidgetToContents();
    };
    
    // Called when the editor is added to the DOM we override this in main.js
    ResponseInlineEdit.prototype.onAdded = function () {
        ResponseInlineEdit.prototype.parentClass.onAdded.apply(this, arguments);
    };

    // When the editor is closed using the esc key we clean up and release the doc
    ResponseInlineEdit.prototype.onClosed = function () {
        ResponseInlineEdit.prototype.parentClass.onClosed.apply(this, arguments);
        this.doc.releaseRef();
    };

    // Function that sizes the inline editor based on the size of its contents
    ResponseInlineEdit.prototype.sizeInlineWidgetToContents = function () {
        ResponseInlineEdit.prototype.parentClass.sizeInlineWidgetToContents.call(this, true);
        this.hostEditor.setInlineWidgetHeight(this, this.$editorHolder.height() + this.$header.height(), false);
    };
    
    // This refreshes the contents of the editor and also resizes it
    ResponseInlineEdit.prototype.refresh = function () {
        ResponseInlineEdit.prototype.parentClass.refresh.apply(this, arguments);
        this.sizeInlineWidgetToContents(true);
        if (this.editor) {
            this.editor.refresh();
        }
    };

    /**
     * Updates the presentation of the inline editor, setting the background colour of the inline 
     * mark and the width label based on the passed in query object
     *
     * @param cq: the current query mark that is selected/active
     */
    ResponseInlineEdit.prototype.refreshMediaQueryInfo = function (cq) {

        // Style the inline mark to match the color of the current query.
        this.$inlineMark[0].style.backgroundImage = "url('file://" + modulePath + "/../images/ruler_min.png'), -webkit-gradient(linear, left top, left bottom, from(" + cq.color.t + "), to(" + cq.color.b + "))";
        this.$wd[0].innerText = cq.width + "px";
    };
    
    /**
     * Called to refresh the contents of the selector drop down in the inline editor
     *
     * @param res: the css rules for the selected html dom element
     * @param inlineSelector: the currently selected css selector that is being editted
     */
    ResponseInlineEdit.prototype.refreshSelectorDropdown = function (res, inlineSelector) {
        
        var i = 0;

        // Choose the first selector if a selector is not already selected or
        // if the current one is no longer available.
        if (!inlineSelector || res.selectors.indexOf(inlineSelector) === -1) {
            inlineSelector = res.selectors[0];
        }

        // clear all options from the select box first
        this.$selectorSelect.empty();

        // Loop through the returned CSS selectors and populate the select box.
        while (i < res.selectors.length) {
            var s = this.$selectorSelect[0].appendChild(document.createElement('option'));
            s.text = s.value = res.selectors[i];

            // We will select the first selector in the array as the are sorted based on specificity.
            if (res.selectors[i] === inlineSelector) {
                s.selected = true;
                this.$selectorSelect[0].selectedIndex = i;
                this.currentSelector = s.value;
            }

            i++;
        }
    };
    
    
    // Make it public
    exports.ResponseInlineEdit = ResponseInlineEdit;
});
