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

/*
/* IMPORTANT NOTE: this is essentially a bare-bones version of the MultiRangeInlineEditor.
*  Most of the jQuery has been removed and it basically is just a light wrapper on the
*  InlineTextEditor module, which is currently not completed.
*/

define(function (require, exports, module) {
    "use strict";
    
    // This is essentially a sub-class on the InlineTextEditor
    var InlineTextEditor = brackets.getModule("editor/InlineTextEditor").InlineTextEditor;
    
    function ResponseInlineEdit() {
        InlineTextEditor.call(this);
        this.doc;
    }

    ResponseInlineEdit.prototype = Object.create(InlineTextEditor.prototype);
    ResponseInlineEdit.prototype.constructor = ResponseInlineEdit;
    ResponseInlineEdit.prototype.parentClass = InlineTextEditor.prototype;    
    ResponseInlineEdit.prototype.editorDiv = null;

    /*
    /* I changed the arguments sent to load to make it more compatible with the extension.
    *  @param: [1] main editor, [2] CSS selector for this quick edit, [3] start line number
    *          the temp CSS file, [4] display up to this end line, [5] the tempCSSDoc 
    */
    ResponseInlineEdit.prototype.load = function (hostEditor, selector, start, end, doc) {
        
        ResponseInlineEdit.prototype.parentClass.load.apply(this, arguments);

        this.doc = doc;

        // Create the container div for the inline editor
        this.editorDiv = window.document.createElement("div");
        this.editorDiv.classList.add("inlineEditorHolder");
        
        // Prevent mousewheel oddities that can unfocus the editor
        this.editorDiv.addEventListener("mousewheel", function (e) {
            e.stopPropagation();
        });

        // The magic line that creates and displays the inline editor
        this.createInlineEditorFromText(doc, start, end, this.editorDiv);
        this.editor.focus();
        this.editor.refresh();

        // Size the inline editor to its contents
        this.sizeInlineWidgetToContents();

        // Append the editor div to the main div created in the super class
        this.$htmlContent.append(this.editorDiv);    
    };
    
    // Called when the editor is added to the DOM we override this in main.js
    ResponseInlineEdit.prototype.onAdded = function () {
        ResponseInlineEdit.prototype.parentClass.onAdded.apply(this, arguments);
    };

    // When the editor is closed using the esc key we clean up and release the doc
    ResponseInlineEdit.prototype.onClosed = function () {
        ResponseInlineEdit.prototype.parentClass.onClosed.apply(this, arguments);
        this.doc.releaseRef();
        this.editorDiv.removeEventListener("mousewheel");
    };

    // Function that sizes the inline editor based on the size of its contents
    ResponseInlineEdit.prototype.sizeInlineWidgetToContents = function () {
        ResponseInlineEdit.prototype.parentClass.sizeInlineWidgetToContents.call(this, true);       
        this.hostEditor.setInlineWidgetHeight(this, this.editorDiv.offsetHeight, false);   
    };
    
    // This refreshes the contents of the editor and also resizes it
    ResponseInlineEdit.prototype.refresh = function () {
        ResponseInlineEdit.prototype.parentClass.refresh.apply(this, arguments);
        this.sizeInlineWidgetToContents(true);
        this.editors[0].refresh();
    };

    // Make it public
    exports.ResponseInlineEdit = ResponseInlineEdit;
});
