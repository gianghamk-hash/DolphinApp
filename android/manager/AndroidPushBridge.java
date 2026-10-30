package com.dolphin.cruise;

import android.Manifest;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.messaging.FirebaseMessaging;

/** Only injected into the Manager variant and only callable from trusted Dolphin pages. */
public final class AndroidPushBridge {
    private final AppCompatActivity activity;
    private final WebView webView;
    private final ActivityResultLauncher<String> permissionLauncher;

    public AndroidPushBridge(AppCompatActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.permissionLauncher = activity.registerForActivityResult(
                new ActivityResultContracts.RequestPermission(), granted -> {
                    if (granted) readToken();
                    else deliverToWeb("");
                });
    }

    private boolean trustedPage() {
        String url = webView.getUrl();
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        return "https".equals(uri.getScheme())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && ("dolphinfb.store".equals(uri.getHost())
                    || ("gianghamk-hash.github.io".equals(uri.getHost())
                        && uri.getPath() != null && uri.getPath().startsWith("/DolphinApp/")));
    }

    private boolean permissionGranted() {
        return Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(
                activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface public void requestToken() {
        activity.runOnUiThread(() -> {
            if (!trustedPage()) return;
            if (!permissionGranted()) permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            else fetchToken();
        });
    }

    @JavascriptInterface public void readToken() {
        activity.runOnUiThread(() -> {
            if (trustedPage() && permissionGranted()) fetchToken();
        });
    }

    private void fetchToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful()) deliverToWeb(task.getResult());
            else deliverToWeb("");
        });
    }

    private void deliverToWeb(String token) {
        activity.runOnUiThread(() -> {
            if (!trustedPage()) return;
            String js = "window.DolphinPush && window.DolphinPush.receiveNativeToken("
                    + org.json.JSONObject.quote(token == null ? "" : token) + ");";
            webView.evaluateJavascript(js, null);
        });
    }
}
