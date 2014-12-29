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
/*global define, $, Mustache */

/*
 * UI for the Document Reload bar which is responsible to ask the user if they
 * would like to reload the preview pane with the newly open document when the
 * user switches between html elements
 */
define(function (require, exports, module) {
    "use strict";

    var ModalBar           = brackets.getModule("widgets/ModalBar").ModalBar,
        DocumentManager    = brackets.getModule("document/DocumentManager"),
        Strings            = require("strings");
/*    
    var _                  = require("thirdparty/lodash"),
        EventDispatcher    = require("utils/EventDispatcher"),
        Commands           = require("command/Commands"),
        KeyBindingManager  = require("command/KeyBindingManager"),
        KeyEvent           = require("utils/KeyEvent"),
        ModalBar           = require("widgets/ModalBar").ModalBar,
        PreferencesManager = require("preferences/PreferencesManager"),
        MainViewManager    = require("view/MainViewManager"),
        ViewUtils          = require("utils/ViewUtils");
*/
    
    /**
     * @private
     * The template we use for all Find bars.
     * @type {string}
     */
    var _htmlTemplate = require("text!htmlContent/docreload-bar.html");
    
    /** 
     * @private
     * @type {?ModalBar} Modal bar containing this find bar's UI
     */
    DocReloadBar.prototype._modalBar = null;
    
    /**
     * @constructor
     */
    function DocReloadBar() {
        
    }

    DocReloadBar.prototype.open = function () {
        var bar = this;
        
        if (!this._modalBar) {
            this._modalBar = new ModalBar(Mustache.render(_htmlTemplate, Strings), false);
            
            var $root = this._modalBar.getRoot();
            $root
                .on("click", "#docreload-ok", function (e) {
                    // get the current document and update frame src attribute
                    var currentDoc = DocumentManager.getCurrentDocument();
                    var previewPaneUrl = "file://" + currentDoc.file.fullPath;

                    var frame = document.getElementById('frame');
                    frame.contentWindow.document.location.href = previewPaneUrl;
                    //frame.src = previewPaneUrl;
                
                    bar.close();
                })
                .on("click", "#docreload-cancel", function (e) {
                    bar.close();
                });
        }
    }

    DocReloadBar.prototype.close = function(e) {

        if (e) e.stopImmediatePropagation();
        if (this._modalBar) {
            this._modalBar.close();
            this._modalBar = null;
        }
    }
    
    exports.DocReloadBar = DocReloadBar;
});