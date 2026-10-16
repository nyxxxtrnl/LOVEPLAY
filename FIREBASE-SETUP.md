# LovePlay chat setup

The chat uses Firebase Authentication, Cloud Firestore, and Firebase Storage
for shared photos and voice messages. Optional online presence uses Firebase
Realtime Database. GitHub Pages can host the page, but Firebase must be
configured separately before people can sign in or exchange messages.

## 1. Create and configure Firebase

The LovePlay Firebase project is `loveplay-88530`. Its Web app configuration and
Realtime Database URL are already set in
[`DASHBOARD/firebase-config.js`](./DASHBOARD/firebase-config.js).

Firebase resources and access:

- Enable Email/Password under Authentication → Sign-in method.
- Cloud Firestore should be created in Singapore (`asia-southeast1`). Publish
  the current [`firestore.rules`](./firestore.rules) after these chat changes;
  pushing the source code does not update Firebase rules.
- Create or confirm the Firebase Storage bucket, then publish the current
  [`storage.rules`](./storage.rules). Media uploads need an active bucket.
- Realtime Database should be created in Singapore with
  [`database.rules.json`](./database.rules.json) published.
- Add `nyxxxtrnl.github.io` under Authentication → Settings → Authorized
  domains.

The browser config values are public; never put passwords, service-account
keys, or private server credentials in `firebase-config.js`.

The Firestore rules allow signed-in users to find display names and read/write
only conversations they participate in. Email addresses are not stored in the
public profile documents. Users may update their own display name and a
compressed profile photo (up to 180,000 characters) in their profile document.
This profile photo is stored in Firestore. Conversation photos and voice notes
use Firebase Storage; Storage rules restrict each upload to a signed-in
conversation participant and limit images to 8 MB and audio to 10 MB. Message
reactions and sender-only deletion are validated by Firestore rules. Chat color
themes are saved on the current device.

Publish the current contents of [`firestore.rules`](./firestore.rules) in
Firebase Console → Firestore Database → Rules, and publish
[`storage.rules`](./storage.rules) in Firebase Console → Storage → Rules.
Pushing to GitHub does not automatically deploy Firebase security rules. New
message sends, media uploads, reactions, and deleting messages will fail until
the matching rules are published.

## Sign-in troubleshooting

- `auth/operation-not-allowed`: enable Email/Password under Authentication
  sign-in methods.
- `auth/app-not-authorized`: add the hosting domain to Authorized domains.
- `auth/invalid-api-key` or `auth/configuration-not-found`: check the Web app
  configuration values and that they belong to the same Firebase project as
  Firestore.
- A Firestore permission error: publish `firestore.rules` to that project.
- Active status is disabled: set the Realtime Database URL and publish
  `database.rules.json` to the same Firebase project.

## Publish and test

Publish the updated project to GitHub Pages over HTTPS. Open the published site,
create an account with an email and password, then use **Chat → Find people** to
search for another registered user. Search requires at least two letters and
shows up to 30 matching names at a time. A conversation is private to its two
participants.

The chat needs an internet connection and the Firebase setup above. If it shows
a Firebase permission error, confirm that the rules were published to the same
project ID as the web config.

Photo and voice messages upload to the Firebase Storage bucket. Voice recording
requires an HTTPS page and microphone permission. GIF search opens GIPHY; paste
a direct GIF image URL from GIPHY or Tenor to send it. Stickers are built-in
emoji stickers.

## Spotify playback

LovePlay uses Spotify's official player. A preview or sign-in prompt may appear
depending on the track, location, and Spotify account. To hear the full song,
sign in to Spotify in the embed or open the song in Spotify. The site cannot
override Spotify's playback or account restrictions.

The Music search field opens results on Spotify, YouTube Music, or Bandcamp.
Use official streaming services for listening; only download songs when the
artist or label authorizes downloads or purchases through a service such as
Bandcamp.
