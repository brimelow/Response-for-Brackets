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

The location and filename of the media query css file can now be defined as a property so each project can dictate its own location. The property name is responsive.mediaQueryFile and an example of a .brackets.json file in the projects location is:

    {
        "responsive.mediaQueryFile": "css2/media-queries2.css"
    }

The default value for the media query css file is css/media-queries.css


