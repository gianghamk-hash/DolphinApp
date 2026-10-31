package com.dolphin.cruise;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/** Receives FCM even when the WebView is suspended or the Android screen is locked. */
public class DolphinMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL = "dolphin_manager_orders";

    @Override public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        getSharedPreferences("dolphin_push", MODE_PRIVATE).edit().putString("token", token).apply();
        // Token is securely registered via Firebase Auth in the WebView on next app open.
    }

    @Override public void onMessageReceived(@NonNull RemoteMessage message) {
        Map<String, String> data = message.getData();
        if (!"dolphin-order".equals(data.get("type"))) return;
        String url = data.get("url");
        Uri parsed = url == null ? null : Uri.parse(url);
        if (parsed == null || !"https".equals(parsed.getScheme())
                || !"dolphinfb.store".equals(parsed.getHost())
                || !"/index.html".equals(parsed.getPath())) {
            url = "https://dolphinfb.store/index.html";
        }
        NotificationManager mgr = getSystemService(NotificationManager.class);
        if (mgr == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL,
                    "Dolphin Manager · Order và yêu cầu", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Order mới và yêu cầu phục vụ từ các outlet.");
            mgr.createNotificationChannel(channel);
        }
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("dolphin_push_url", url);
        int id = data.get("eventId") == null ? (int)System.currentTimeMillis() : data.get("eventId").hashCode();
        PendingIntent tap = PendingIntent.getActivity(this, id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder n = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(data.get("title") == null ? "Dolphin Manager" : data.get("title"))
                .setContentText(data.get("body") == null ? "Có yêu cầu mới." : data.get("body"))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(tap);
        try {
            mgr.notify(id, n.build());
        } catch (SecurityException ignored) {
            // User denied POST_NOTIFICATIONS or Android has blocked the channel.
        }
    }
}
