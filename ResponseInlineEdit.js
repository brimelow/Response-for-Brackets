
/*
/* IMPORTANT NOTE: this was meant to be a lightweight version of the MultiRangeIlineTextEditor
/* but I never really got a chance to work on it mucn. So basically there isn't much to see here.
*/

define(function (require, exports, module) {
    "use strict";
    
    // Load dependent modules
    var InlineTextEditor    = brackets.getModule("editor/InlineTextEditor").InlineTextEditor,
        EditorManager       = brackets.getModule("editor/EditorManager"),
        Commands            = brackets.getModule("command/Commands"),
        CommandManager      = brackets.getModule("command/CommandManager");
    
    /**
     * @constructor
     * @param {Array.<{name:String,document:Document,lineStart:number,lineEnd:number}>} ranges The text ranges to display.
     * @extends {InlineTextEditor}
     */
    function ResponseInlineEdit() {
        InlineTextEditor.call(this);
        this.doc;
    }

    ResponseInlineEdit.prototype = Object.create(InlineTextEditor.prototype);
    ResponseInlineEdit.prototype.constructor = ResponseInlineEdit;
    ResponseInlineEdit.prototype.parentClass = InlineTextEditor.prototype;    
    ResponseInlineEdit.prototype.$editorsDiv = null;

    /** 
     * @override
     * @param {!Editor} hostEditor  Outer Editor instance that inline editor will sit within.
     * 
     */
    ResponseInlineEdit.prototype.load = function (hostEditor, selector, start, end, doc) {
        ResponseInlineEdit.prototype.parentClass.load.apply(this, arguments);

        this.doc = doc;

        this.$editorsDiv = $(window.document.createElement("div")).addClass("inlineEditorHolder");
        
        // Prevent touch scroll events from bubbling up to the parent editor.
        this.$editorsDiv.on("mousewheel.ResponseInlineEdit", function (e) {
            e.stopPropagation();
        });

        this.createInlineEditorFromText(doc, start, end, this.$editorsDiv.get(0));
        this.editors[0].focus();
        this.editors[0].refresh();
        this.sizeInlineWidgetToContents(true, false);

        // attach to main container
        this.$htmlContent.append(this.$editorsDiv);
    
    };
    
    /**
     * @override
     */
    ResponseInlineEdit.prototype.onAdded = function () {
        // Before setting the inline widget height, force a height on the
        // floating related-container in order for CodeMirror to layout and
        // compute scrollbars
        this.$relatedContainer.height(this.$related.height());

        // Call super
        ResponseInlineEdit.prototype.parentClass.onAdded.apply(this, arguments);


    };

//     * Called any time inline is closed, whether manually (via closeThisInline()) or automatically
    ResponseInlineEdit.prototype.onClosed = function () {
        // Superclass onClosed() destroys editor
        ResponseInlineEdit.prototype.parentClass.onClosed.apply(this, arguments);

        this.doc.releaseRef();

        // Remove event handlers
        this.$htmlContent.off(".ResponseInlineEdit");
        this.$editorsDiv.off(".ResponseInlineEdit");
    };
  
    /**
     * Based on the position of the cursor in the inline editor, determine whether we need to change the
     * vertical scroll position of the host editor to ensure that the cursor is visible.
     */
    ResponseInlineEdit.prototype._ensureCursorVisible = function () {
        if ($.contains(this.editors[0].getRootElement(), window.document.activeElement)) {
            var hostScrollPos = this.hostEditor.getScrollPos(),
                cursorCoords = this.editors[0]._codeMirror.cursorCoords();
            
            // Vertically, we want to set the scroll position relative to the overall host editor, not
            // the lineSpace of the widget itself. We don't want to modify the horizontal scroll position.
            var scrollerTop = this.hostEditor.getVirtualScrollAreaTop();
            this.hostEditor._codeMirror.scrollIntoView({
                left: hostScrollPos.x,
                top: cursorCoords.top - scrollerTop,
                right: hostScrollPos.x,
                bottom: cursorCoords.bottom - scrollerTop
            });
        }
    };

    /**
     * Overwrite InlineTextEditor's _onLostContent to do nothing if the document's file is deleted
     * (deletes are handled via TextRange's lostSync).
     */
    ResponseInlineEdit.prototype._onLostContent = function (event, cause) {
        // Ignore when the editor's content got lost due to a deleted file
        if (cause && cause.type === "deleted") { return; }
        // Else yield to the parent's implementation
        return ResponseInlineEdit.prototype.parentClass._onLostContent.apply(this, arguments);
    };


    /**
     * Sizes the inline widget height to be the maximum between the range list height and the editor height
     * @override 
     * @param {boolean} force the editor to resize
     * @param {boolean} ensureVisibility makes the parent editor scroll to display the inline editor. Default true.
     */
    ResponseInlineEdit.prototype.sizeInlineWidgetToContents = function (force, ensureVisibility) {
        // Size the code mirror editors height to the editor content
        // We use "call" rather than "apply" here since ensureVisibility was an argument added just for this override.
        ResponseInlineEdit.prototype.parentClass.sizeInlineWidgetToContents.call(this, force);
        
        this.hostEditor.setInlineWidgetHeight(this, this.$editorsDiv.height(), ensureVisibility);
    
    };
    
    /**
     * Refreshes the height of the inline editor and all child editors.
     * @override
     */
    ResponseInlineEdit.prototype.refresh = function () {
        ResponseInlineEdit.prototype.parentClass.refresh.apply(this, arguments);
        this.sizeInlineWidgetToContents(true);
        this.editors.forEach(function (editor) {
            editor.refresh();
        });
    };

    /**
     * Returns the currently focused ResponseInlineEdit.
     * @returns {ResponseInlineEdit}
     */
    function _getFocusedResponseInlineEdit() {
        var focusedWidget = EditorManager.getFocusedInlineWidget();
        if (focusedWidget instanceof ResponseInlineEdit) {
            return focusedWidget;
        } else {
            return null;
        }
    }

    exports.ResponseInlineEdit = ResponseInlineEdit;
});
