# Restaurant Smart POS — Real Physical Device Testing Protocol

> **CRITICAL DIRECTIVE**: Physical device tests cannot be performed by automated AI agents and require manual execution by the restaurant operations team on actual hardware (Android phone, Android POS terminal, iPhone, or iPad).

---

## Device Test Sequence

### Test 1: App Installation & Launch
- **Action**: Install the app via Expo Go or native APK/IPA and open it.
- **Expected Result**: App launches to splash screen with slate background (`#0F172A`) and transitions cleanly to the Waiter Login screen.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 2: Waiter Authentication
- **Action**: Enter valid waiter credentials (`waiter` / staff password) and tap **Sign In**.
- **Expected Result**: JWT token is securely stored; app routes directly to the main Bottom Tabs floor overview.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 3: Floor Plan Navigation & Section Tabs
- **Action**: View table floor plan; tap between section tabs (e.g., "Main Hall", "Terrace").
- **Expected Result**: Tables update dynamically; occupancy indicators match the Web POS floor view.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 4: Table Selection & Order Creation
- **Action**: Select an available table, choose guest count, and tap **Open Menu**.
- **Expected Result**: Menu catalog loads with categories, food/drink department tabs, and search bar.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 5: Cart Management & Cooking Notes
- **Action**: Add 2–3 items, open cart, tap **Add Note** (e.g. "Extra spicy"), and tap **Send to Kitchen**.
- **Expected Result**: Idempotency locks double taps; order is created on the server and returns the Order ID.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 6: Web POS & KDS Synchronization
- **Action**: Observe the Web POS Floor Plan and Kitchen Display System (KDS).
- **Expected Result**: The table marks as Occupied in Web POS and the kitchen ticket appears immediately on the KDS screen.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 7: Bar Display System (BDS) Routing
- **Action**: Add a beverage/cocktail item to an order.
- **Expected Result**: Drink item is routed to the BDS screen at the bar station.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 8: Real-Time Status Push
- **Action**: Advance the order status on the KDS from `PENDING` to `PREPARING` and then `READY`.
- **Expected Result**: The waiter's phone screen automatically updates the status badge without manual page refresh.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 9: Network Drop & Recovery
- **Action**: Add an item to cart, enable **Airplane Mode**, wait 5 seconds, then disable Airplane Mode.
- **Expected Result**: Amber "Offline" banner appears when disconnected and dismisses upon reconnection; cart contents remain intact.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 10: Cashier Settlement & Table Reset
- **Action**: Cashier completes payment and closes the invoice on the Web POS.
- **Expected Result**: Mobile Waiter table view receives `payment.completed` event and releases the table back to `AVAILABLE`.
- **Status**: `MANUAL DEVICE TEST REQUIRED`

### Test 11: Waiter Logout & Route Protection
- **Action**: Open Profile tab and tap **Sign Out**.
- **Expected Result**: Tokens are wiped from storage; user is redirected to `/login`; back button cannot re-enter protected routes.
- **Status**: `MANUAL DEVICE TEST REQUIRED`
