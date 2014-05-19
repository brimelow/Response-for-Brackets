Response-for-Brackets
=====================

<img src="http://www.leebrimelow.com/images/shot1.png">

_**IMPORTANT:** this code only currently works in Brackets sprint 25. I haven't had the time to update it for the latest version of Brackets but I don't think it would require much effort. I would love some help if anyone is interested in contributing._

Welcome to the source code for my responsive design tool for Brackets. Remember that while this code does actually work, it is still just a prototype. If you don't follow the guidelines below when trying it out then **all hell could break loose** :).

##Check out the demo
Before looking into the code you should first test out the feature running inside of Brackets. Follow the steps below to get started:

1. Clone this respository to your hard drive.
2. Download either the Mac or Windows demo zip file, which contains a patched version of Brackets with the extension already installed.
3. Open Brackets and go to ***File > Open Folder*** and choose the ***demo website*** folder at the root of this respository.
4. You should now see the split view and the response UI.
5. Now go and watch the video at **http://www.youtube.com/watch?v=kXTP8XqrSwE** and follow the exact steps I did test the feature.
6. There is not a lot of error checking in the code so following my demo will let you see the features without any issues.
7. After that try to break it and let me know the issues you see.

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

Like I mentioned earlier, I highly recommend watching the video at **http://www.youtube.com/watch?v=kXTP8XqrSwE** and follow my demo to help you get used to the tool.

Thanks in advance for any feedback you have!





