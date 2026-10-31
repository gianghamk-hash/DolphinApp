/* Public Firebase web configuration. Messaging fields supplied by the project owner from Firebase Console.
   Firebase Web config and VAPID PUBLIC key are not credentials; do not commit any private keys. */
(function(root){
  root.DOLPHIN_PUSH_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: 'dolphin-f6d67.firebaseapp.com',
    projectId: 'dolphin-f6d67',
    messagingSenderId: '547227270636', // Firebase Console > Project settings > Cloud Messaging
    appId: '1:547227270636:web:13b7d1305c3eedf65894c9',              // Firebase Console > Project settings > Your apps > Web app
    vapidKey: 'BH4IarFNGReQxTUrUoxUneSDXMYk4OJWhgTm7XNMgxQC1c78REGEq0hPaZ7GTxDAZQpmTtVQEv5SVv5NGArUoQA'             // Firebase Console > Cloud Messaging > Web Push certificates > public key
  };
})(typeof self !== 'undefined' ? self : window);
