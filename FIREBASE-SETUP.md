# LovePlay chat setup

The chat uses Firebase Authentication and Cloud Firestore. Optional online
presence uses Firebase Realtime Database. GitHub Pages can host the page, but
Firebase must be configured separately before people can sign in or exchange
messages.

## 1. Create and configure Firebase

The LovePlay Firebase project is `loveplay-88530`. Its Web app configuration and
Realtime Database URL are already set in
[`DASHBOARD/firebase-config.js`](./DASHBOARD/firebase-config.js).

Completed in Firebase:

- Email/Password sign-in is enabled.
- Cloud Firestore is created in Singapore (`asia-southeast1`) with the rules in
  [`firestore.rules`](./firestore.rules) published.
- Realtime Database is created in Singapore with the rules in
  [`database.rules.json`](./database.rules.json) published.
- `nyxxxtrnl.github.io` is an authorized Firebase Authentication domain.

The browser config values are public; never put passwords, service-account
keys, or private server credentials in `firebase-config.js`.

The Firestore rules allow signed-in users to find display names and read/write
only conversations they participate in. Email addresses are not stored in the
public profile documents. Users may update their own display name and a
compressed profile photo (up to 180,000 characters) in their profile document.
This photo is stored in Firestore; Firebase Storage and a billing-plan upgrade
are not required for avatars. Do not replace these rules with open read/write
rules.
When [`firestore.rules`](./firestore.rules) changes, publish its latest contents
in Firebase Console → Firestore Database → Rules. Pushing to GitHub does not
automatically deploy Firebase security rules.

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

## Spotify playback

LovePlay uses Spotify's official player. A preview or sign-in prompt may appear
depending on the track, location, and Spotify account. To hear the full song,
sign in to Spotify in the embed or open the song in Spotify. The site cannot
override Spotify's playback or account restrictions.
