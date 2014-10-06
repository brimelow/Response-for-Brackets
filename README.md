# How to install Response for Brackets

## Hacking brackets
1. Install the latest Brackets build (this gives you the native shell binaries which you'll use in step 6)
2. Fork the brackets repo
3. Clone your fork of the repo: `git clone https://github.com/<username>/brackets.git`
4. Fetch submodules: `cd brackets` and `git submodule update --init`
5. Add an "upstream" remote: `git remote add upstream https://github.com/adobe/brackets.git`
6. Run `setup_for_hacking` script
7. Copy the files from the `src/bracketsCoreChanges` into your cloned `brackets/src` folder 

## Installing the extension
8. Copy all the files from this repo `src` folder to your `C:\Users\<username>\AppData\Roaming\Brackets\extensions\user` folder

# Original project

For more information please visit [Response-forBrackets](https://github.com/brimelow/Response-for-Brackets) by [@brimelow](https://github.com/brimelow)
