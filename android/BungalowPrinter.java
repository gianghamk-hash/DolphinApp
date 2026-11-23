package com.dolphin.cruise;

import android.app.Activity;
import android.content.Context;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** Print a self-contained snapshot. The employee's active WebView stays on the room screen. */
final class BungalowPrinter {
    static boolean isBungalow(String url) {
        if (url == null) return false;
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme()) || (uri.getPort() != -1 && uri.getPort() != 443)) return false;
        return ("dolphinfb.store".equals(uri.getHost()) && "/dolphin-bungalow.html".equals(uri.getPath()))
            || ("gianghamk-hash.github.io".equals(uri.getHost()) && "/DolphinApp/dolphin-bungalow.html".equals(uri.getPath()));
    }

    static boolean open(Activity activity, String snapshot) {
        if (snapshot == null || snapshot.length() > 1500000 || activity.isFinishing()) return false;
        PrintManager manager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
        if (manager == null) return false;
        final WebView paper = new WebView(activity);
        paper.getSettings().setAllowFileAccess(false);
        paper.getSettings().setAllowContentAccess(false);
        paper.getSettings().setBlockNetworkLoads(true);
        paper.setWebViewClient(new WebViewClient() {
            private boolean started;
            @Override public void onPageFinished(WebView view, String url) {
                if (started) return;
                started = true;
                if (activity.isFinishing() || activity.isDestroyed()) { view.destroy(); return; }
                try {
                    String name = "Biển bàn Bungalow";
                    manager.print(name, view.createPrintDocumentAdapter(name), new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .setColorMode(PrintAttributes.COLOR_MODE_COLOR).build());
                } catch (RuntimeException e) {
                    view.destroy();
                    Toast.makeText(activity,"Không mở được dịch vụ in Android.",Toast.LENGTH_LONG).show();
                }
            }
        });
        paper.loadDataWithBaseURL(null, snapshot, "text/html", "utf-8", null);
        return true;
    }
}
