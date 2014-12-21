# How to install Response for Brackets

## Hacking brackets 
There is no longer a need to hack brackets

## Installing the extension from extension manager
1. Open Extension Manager
2. Find the "Response for Brackets - original" extension and install it

## Installing the extension manually
1. Choose Help > Show Extensions Folder (or open it manually)
2. Drill down to the user folder
3. Create a 'Response-for-Brackets' folder
4. Copy all the files from this repo `src` folder to the 'Response-for-Brackets' folder created in step 3
5. Quit and re-launch Brackets or hit f5 to reload with extensions

# Preferences

## responsive.mediaQueryFile
The location and filename of the media query css file can now be defined as a property so each project can dictate its own location. The default value for the media query css file is css/media-queries.css

## responsive.preferredLayout
The user can now define a preferred layout for when the user switches to responsive mode. This property will update the Response > Horizontal View or Response > Vertical View menu items depending on how it is set. It can either be set to 'horizontal' or 'vertical' and is case insensitive. The default value for the layout is 'vertical'.

## responsive.useLivePreviewUrl
The user can now define if the reponsive mode should use the Live Preview Base URL settings defined in File > Project Settings by default. The purpose of this is to allow users using any dynamic language to be able to use the responsive mode. The default value for this property is false.

## example preferences file
The following is an example of the .brackets.json file that can be defined for each preferences

    {
        "responsive.mediaQueryFile": "css2/media-queries2.css"
        "responsive.preferredLayout": "horizontal",
        "responsive.useLivePreviewUrl": true
    }

# Notes

1. When working with static files, the responsive mode will only open if you are currently editing an HTML file. Nothing will happen if you currently have a CSS or JS file open as the active file.
2. It is now possible to use the Live Preview Base URL setting under File > Project Settings to indicate what will be loaded in the preview pane. When the Response > Use Live Preview URL menu item is checked, then the plugin will load the URL defined in the project settings. If there isn't a URL defined, then it will load the current active document if it is an HTML file.