/* Public Firebase web configuration. Complete messagingSenderId, appId and vapidKey from Firebase Console.
   Firebase Web config and VAPID PUBLIC key are not credentials; do not commit any private keys. */
(function(root){
  root.DOLPHIN_PUSH_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: 'dolphin-f6d67.firebaseapp.com',
    projectId: 'dolphin-f6d67',
    messagingSenderId: '', // Firebase Console > Project settings > Cloud Messaging
    appId: '',              // Firebase Console > Project settings > Your apps > Web app
    vapidKey: ''             // Firebase Console > Cloud Messaging > Web Push certificates > public key
  };
})(typeof self !== 'undefined' ? self : window);
