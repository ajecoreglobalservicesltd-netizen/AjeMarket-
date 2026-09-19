# AjeMarket Android App

AjeMarket Android wrapper for the live website:

https://ajemarket.ng/

## Current Android build target
- compileSdk: 36
- targetSdk: 36 (Android 16)
- minSdk: 23
- versionName: 1.1

The app uses Android WebView to load the live AjeMarket website.


## V2.1 review notes
- Kept the existing applicationId so this build can be used as an update to the same AjeMarket app.
- Kept the live website URL unchanged: https://ajemarket.ng/
- Android target remains API 36 / Android 16.
- Added an explicit AndroidX Activity dependency used by the back-navigation code.
- No AjeMarket website files or Supabase configuration are included or changed by this Android project.
- GitHub Actions builds the debug APK as a separate Android artifact.
