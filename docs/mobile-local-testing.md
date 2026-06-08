# Mobile Local Testing

Use LAN mode when testing Nammude from a phone on the same WiFi network.

## Start The App

```bash
npm run dev:lan
```

The script prints URLs like:

```text
Local:   http://localhost:3000
Network: http://192.168.1.24:3000
```

Open the `Network` URL on your phone.

## Android

1. Connect the phone and laptop to the same WiFi.
2. Open Chrome on the phone.
3. Visit the printed `http://<LAN-IP>:3000` URL.
4. Test Home, Search, Restaurant Menu, Cart, Checkout, POS, and Owner screens.
5. For PWA install and service worker testing, use HTTPS:

```bash
npm run dev:lan:https
```

If Chrome warns about the local certificate, accept it only for local development.

## iPhone

1. Connect the iPhone and laptop to the same WiFi.
2. Open Safari.
3. Visit the printed `http://<LAN-IP>:3000` URL.
4. Use Safari Share > Add to Home Screen for install testing.
5. iOS requires a secure context for full PWA/service-worker behavior, so use `npm run dev:lan:https` or a trusted tunnel when validating installability.

## Firewall Checks

- Allow Node.js through Windows Defender Firewall for private networks.
- Keep both devices on the same WiFi band or VLAN.
- If the phone cannot connect, run `node scripts/show-lan-ip.mjs` and try each printed network URL.
- Avoid guest WiFi networks because they often block device-to-device traffic.

## What To Verify

- Splash page: `/splash`
- Customer discovery: `/`
- Search and restaurant cards: `/restaurants`
- Menu and sticky cart: `/restaurant/cafe-al-arab-thanisandra/menu`
- Checkout: `/checkout`
- Offline page: `/offline`
- Owner dashboard: `/owner`
- POS touchscreen flow: `/pos`
- KDS: `/owner/kitchen`
