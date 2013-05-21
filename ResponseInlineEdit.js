
/*
/* IMPORTANT NOTE: this is essentially a bare-bones version of the MultiRangeInlineEditor.
*  Most of the jQuery has been removed and it basically is just a light wrapper on the
*  InlineTextEditor module, which is currently not completed.
*/

define(function (require, exports, module) {
    "use strict";
    
    var InlineTextEditor = brackets.getModule("editor/InlineTextEditor").InlineTextEditor;
    
    function ResponseInlineEdit() {
        InlineTextEditor.call(this);
        this.doc;
    }

    ResponseInlineEdit.prototype = Object.create(InlineTextEditor.prototype);
    ResponseInlineEdit.prototype.constructor = ResponseInlineEdit;
    ResponseInlineEdit.prototype.parentClass = InlineTextEditor.prototype;    
    ResponseInlineEdit.prototype.editorDiv = null;

    // I changed the arguments sent to load to make it more compatible with the extension.
    ResponseInlineEdit.prototype.load = function (hostEditor, selector, start, end, doc) {
        ResponseInlineEdit.prototype.parentClass.load.apply(this, arguments);

        this.doc = doc;

        this.editorDiv = window.document.createElement("div");
        this.editorDiv.classList.add("inlineEditorHolder");
        
        this.editorDiv.addEventListener("mousewheel", function (e) {
            e.stopPropagation();
        });

        this.createInlineEditorFromText(doc, start, end, this.editorDiv);
        this.editors[0].focus();
        this.editors[0].refresh();
        this.sizeInlineWidgetToContents(true, false);

        this.$htmlContent.append(this.editorDiv);    
    };
    
    ResponseInlineEdit.prototype.onAdded = function () {
        ResponseInlineEdit.prototype.parentClass.onAdded.apply(this, arguments);
    };

    ResponseInlineEdit.prototype.onClosed = function () {
        ResponseInlineEdit.prototype.parentClass.onClosed.apply(this, arguments);

        this.doc.releaseRef();

        this.editorDiv.removeEventListener("mousewheel");
    };

    ResponseInlineEdit.prototype.sizeInlineWidgetToContents = function (force, ensureVisibility) {
        ResponseInlineEdit.prototype.parentClass.sizeInlineWidgetToContents.call(this, force);
        
        this.hostEditor.setInlineWidgetHeight(this, this.editorDiv.offsetHeight, ensureVisibility);   
    };
    
    ResponseInlineEdit.prototype.refresh = function () {
        ResponseInlineEdit.prototype.parentClass.refresh.apply(this, arguments);
        this.sizeInlineWidgetToContents(true);
        this.editors[0].refresh();
    };

    exports.ResponseInlineEdit = ResponseInlineEdit;
});
