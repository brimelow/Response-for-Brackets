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
The user can now define a preferred layout for when the user switches to responsive mode. This property will update the Response > Horizontal View or Response > Vertical View menu items depending on how it is set. It can either be set to 'horizontal' or 'vertical' and is case insensitive. 

## example preferences file
The following is an example of the .brackets.json file that can be defined for each preferences

    {
        "responsive.mediaQueryFile": "css2/media-queries2.css"
        "responsive.preferredLayout": "horizontal"
    }
