# Dolphin Tactics — Android APK landscape / immersive patch

**Important**: This repository contains web/PWA code only; it does not contain an Android Studio project, AndroidManifest.xml, or WebView Activity. The following files are templates to apply to the **actual APK source**, not changes that magically update an installed APK. Rebuild and reinstall the APK after integration.

## 1. AndroidManifest.xml
On the actual Activity that hosts DolphinApp WebView, add:
```xml
android:configChanges="orientation|screenSize|keyboardHidden|smallestScreenSize|screenLayout"
android:hardwareAccelerated="true"
android:screenOrientation="unspecified"
```
Use `unspecified` outside game and request `sensorLandscape` only during Tactics. Do not create a duplicate Activity.

## 2. Existing WebView Activity — Kotlin example

```kotlin
import android.content.pm.ActivityInfo
import android.os.Build
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView

// Add to the existing Activity (do not create a new unrelated WebView).
private fun showGameImmersive(enabled: Boolean) {
    requestedOrientation = if (enabled) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    if (Build.VERSION.SDK_INT >= 30) {
        window.insetsController?.let { c ->
            if (enabled) {
                c.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                c.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            } else c.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
        }
    } else {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = if (enabled)
            (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION)
        else 0
    }
}

// SECURITY: JavascriptInterface is exposed to all frames, including iframe.
// Only use if ALL frames are trusted and under your control. Prefer a strict
// origin-checked WebMessageListener for apps showing external content.
// Never expose file access, arbitrary command execution, or untrusted URLs.
inner class TrustedGameBridge {
    @JavascriptInterface fun enterLandscapeFullscreen() {
        runOnUiThread { showGameImmersive(true) }
    }
    @JavascriptInterface fun exitLandscapeFullscreen() {
        runOnUiThread { showGameImmersive(false) }
    }
}

// Install only if you have audited all framed content as trusted:
// webView.addJavascriptInterface(TrustedGameBridge(), "AndroidGame")
```

## 3. Calling from game

The game iframe notifies its parent via `postMessage`. Wire an origin-checked listener in the host page to call AndroidGame methods if available. The production web change handles fullscreen layout; a native bridge is necessary to rotate the Activity and hide Android system bars.

## 4. Verification
- Game online and offline unchanged on PWA and browser.
- Android APK: full-screen button → Activity rotates landscape, system bars are hidden, side panel scrolls to Ready/Items, back action restores original orientation.
- Other Dolphin screens must not be forced landscape.
- Test Samsung One UI Android gesture navigation, small screens, reconnects, and two orientation changes.

## Security
Do NOT expose a broad, unauthenticated WebView JS interface on sites with arbitrary third-party iframes. If that is your APK architecture, use AndroidX WebKit `WebViewCompat.addWebMessageListener` with allowed origin rules and native message origin validation rather than `addJavascriptInterface`.
