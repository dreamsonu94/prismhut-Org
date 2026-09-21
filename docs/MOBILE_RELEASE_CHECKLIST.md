# Restaurant Smart POS — Mobile Release Checklist & Distribution Guide

This document outlines the step-by-step procedure for preparing, building, testing, and distributing the **Restaurant Smart POS Mobile Waiter App** (`/mobile`) to Android and iOS devices.

---

## 1. Application Metadata & Identifiers

| Parameter | Android Configuration | iOS Configuration |
| :--- | :--- | :--- |
| **App Name** | Restaurant Smart POS — Waiter | Restaurant Smart POS — Waiter |
| **Slug** | `restaurant-smart-pos-waiter` | `restaurant-smart-pos-waiter` |
| **Package / Bundle ID** | `com.smartpos.waiter` | `com.smartpos.waiter` |
| **Version** | `1.0.0` | `1.0.0` |
| **Orientation** | Portrait (`orientation: "portrait"`) | Portrait (`orientation: "portrait"`) |
| **Tablet Support** | Enabled | Enabled (`supportsTablet: true`) |
| **Icon Assets** | `./assets/adaptive-icon.png` | `./assets/icon.png` |
| **Splash Background** | `#0F172A` (Navy slate) | `#0F172A` (Navy slate) |
| **URL Scheme** | `smartposwaiter://` | `smartposwaiter://` |

---

## 2. Environment & Endpoints Configuration

- **Production API URL**: `https://prismhut-org.onrender.com/api/v1`
- **Production Socket.IO**: `https://prismhut-org.onrender.com` (Path: `/socket.io`)
- **Config file**: `mobile/src/constants/config.ts` (overridable with `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL`).

---

## 3. Build & Distribution Options

### Option A: Direct Testing via Expo Go (Immediate)
```bash
cd mobile
npm install
npx expo start
```
- Scan the printed QR code using the **Expo Go** app on Android (Camera/Expo app) or iOS (Camera app).

### Option B: Native APK for Internal Android Devices (Direct Sideload)
For direct distribution to restaurant-owned Android phones or Sunmi/Pax smart terminals:
```bash
cd mobile
# Install EAS CLI if needed
npm install -g eas-cli

# Build Standalone APK
eas build --platform android --profile preview
```

### Option C: Google Play Store Release (Production AAB)
```bash
eas build --platform android --profile production
eas submit --platform android
```

### Option D: Apple App Store / TestFlight Release (Production IPA)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

---

## 4. Release Verification Checklist

### 🤖 Android Release Checklist
- [ ] `app.json` package identifier matches `com.smartpos.waiter`
- [ ] Version number and version code are set correctly
- [ ] Adaptive app icon renders on light and dark Android launchers
- [ ] Splash screen transitions smoothly into login screen
- [ ] Production API URL points to `https://prismhut-org.onrender.com/api/v1`
- [ ] Production Socket connects to Render without SSL warnings
- [ ] Soft keyboard does not obstruct password or note fields (`KeyboardAvoidingView`)
- [ ] Offline banner displays during airplane mode and clears on reconnect
- [ ] Standalone APK / AAB builds successfully without native module link errors

### 🍏 iOS Release Checklist
- [ ] `app.json` bundle identifier matches `com.smartpos.waiter`
- [ ] Version and build numbers are incremented
- [ ] App icon conforms to App Store requirements (1024x1024 without alpha)
- [ ] Safe-area padding respects notch and Dynamic Island across iPhone 12–16
- [ ] Home indicator bar does not overlap bottom navigation tabs
- [ ] Production HTTPS endpoints comply with Apple App Transport Security (ATS)
- [ ] App signs with valid Apple Distribution Certificate and Provisioning Profile
- [ ] TestFlight build uploads and passes automated App Store review checks
