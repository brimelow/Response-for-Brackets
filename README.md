Response-for-Brackets
=====================
_**IMPORTANT:** this code only currently works in Brackets sprint 25._
<br>
<img src="http://www.leebrimelow.com/images/shot1.png">

Welcome to the source code for my responsive design tool for Brackets. Remember that while this code does actually work, it is still just a prototype. If you don't follow the guidelines below when trying it then **all hell could break loose**.

##Source code structure
This prototype was built as an extension with the goal of not making any changes to the Brackets core code. Well I almost was able to do that. There are a couple of changes I had to make to the core code. The modified files are in the ***src/bracketsCoreChanges*** folder and I'll describe them below. Just overwrite the current files in Brackets with my modified versions.
    
###List of changes to Brackets core code

<i class="icon-file"></i> **EditorManager.js**   
Basically you can't create an inline CSS editor that competes with the official one in Brackets. I had to simply swap it so only mine was chosen. Here is the modified code:

```javascript
162   if(providers[i].name.indexOf("inlineEditorProvider") !== -1)
163      inlinePromise = provider(editor, pos); 
```

<i class="icon-file"></i> **FileSyncManager.js**   
Since I'm writing everything to a temporary CSS file Brackets wouldn't stop bugging me about external changes, dirty files, etc. This mod just made it ignore my file. Here is the modified code:

```javascript
252    if (true) {
253      result.resolve();
254      return promise;
255    }
```

<i class="icon-file"></i> **DocumentManager.js**   
Again the issue was with the temp CSS file. I didn't want it showing in the project panel or the working set. The code below basically says "so long as it isn't my file, do what you want".

```javascript
220    function addToWorkingSet(file) {
221       if(file.fullPath.indexOf("temp") === -1) {
```

###Main source files

<i class="icon-file"></i> **main.js**   
This is the where it all happens. The main extension file is around 1500 lines of pure excitement.

<i class="icon-file"></i> **Query.js**   
This is a "class" that represents a single media query and all of its data. This was written a while ago so it isn't a requireJS module, but rather a self executing anonymous function.

<i class="icon-file"></i> **Splitter.js**   
Brackets has a module called Resizer which gives you the ability to resize panels. Since I'm doing some pretty intensive stuff, I re-wrote it to make it super lightweight. I also removed all the jQuery from it.

<i class="icon-file"></i> **ResponseInlineEdit.js**   
For this tool, all I need is an inline editor that you can just feed a string, without the need for a backing file and document. I successfully put one together but then I couldn't get code hinting to work. What I ended up doing is create a super lightweight wrapper around the InlineTextEditor, using the MultiRangeInlineEditor as a guide.

<i class="icon-file"></i> **ResponseUtils.js**   
This module contains some helper functions for the CSS parsing and some DOM functions.

<i class="icon-file"></i> **respond.css**   
All of the CSS for responsive mode lives here. It is a bit of a mess right now.

<i class="icon-file"></i> **TweenMax.min.js**   
This is the animation library I am using to animate both the iframe elements and the lines of code in the editor.

##How to get it working properly
What I've built actually works really well but it is a prototype so there really isn't much error checking going on. Follow the steps below to have a smooth ride.

1. I'm assuming you know how to take these files and get them installed in Brackets.
2. When you launch Brackets you should see the toolbar icon that launches you into responsive mode. If you don't then you didn't put the files in the right place.
3. Open the developer tools as it would helpful to know what errors you're seeing if any.
4. I have provide the full demo HTML site I used at MAX so I recommend opening that folder into Brackets.
5. Open the index.html file and then either click on the toolbar icon or hit Cmd-2 to launch into responsive mode.
6. You should now see the split view with preview above and the editor below.
7. The first thing you should do is create a media query. Move the ruler and click on the + button.
8. Click the inspect mode button or hit CMD-1 to try the slinky DOM highlighting.
9. Clicking on a DOM element should animate the correct line of code in view in the editor.
10. Click on a tag in the editor should move the DOM element into place.
11. With a media query selected, you can select a DOM element and hit Cmd-E to go into a response quick edit.

##There's an easier way##
Just follow the steps I show the video below. The images are different but the site's HTML is the same as the demo site included in the source.

**http://www.youtube.com/watch?v=kXTP8XqrSwE**

Let me know how it goes :)





