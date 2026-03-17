# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Prereqs

### Cognito

Create a file `.env` with the following variables:

```
COGNITO_USER_POOL_ID = "pool-id"
COGNITO_CLIENT_ID = "client-id"
```

You will need aws access to grab the correct values.

### Dev server

Set up an alias in your `/etc/hotst` file to point `127.0.0.1` to `dev.yourbandsucks.com`. This is the only whitelisted origin for S3.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Troubleshooting

Run `npx expo start --clear` to clear out the cache if you are having trouble loading env variables.
