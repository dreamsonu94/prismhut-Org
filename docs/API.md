# Restaurant Smart POS — API Documentation v1.0

This API contract is designed for both the Web POS Frontend and the upcoming **React Native Waiter Mobile App**.

- **Base URL**: `http://<SERVER_IP>:3000/api/v1`
- **Protocol**: HTTP/1.1 REST + WebSocket (Socket.IO on `/socket.io`)
- **Authentication**: JWT Bearer Token in `Authorization: Bearer <TOKEN>` header.
- **Content Type**: `application/json`

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description"
  }
}
```

---

## 1. Authentication

### `POST /auth/login`
- **Body**:
  ```json
  {
    "username": "waiter",
    "password": "password123"
  }
  ```
- **Response**: Returns `{ user: { id, name, username, role, restaurant }, token }`

### `GET /auth/me`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**: Current authenticated user profile & restaurant configuration.

### `POST /auth/logout`
- **Headers**: `Authorization: Bearer <TOKEN>`

---

## 2. Table Management

### `GET /tables`
- Returns all tables grouped by section with `activeOrder` information (guestCount, waiter, amounts, status, KOT/BOT status).

### `POST /tables`
- Requires `ADMIN` or `MANAGER`. Creates a new table.

### `GET /tables/:id`
- Full table details and active order breakdown.

### `PUT /tables/:id`
- Update table details or status (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `OUT_OF_SERVICE`).

---

## 3. Menu & Categories

### `GET /menu/categories`
- Returns all menu categories with item counts.

### `GET /menu/items`
- **Query Params**:
  - `categoryId`: filter by category
  - `department`: `KITCHEN` or `BAR`
  - `available`: `true` or `false`
  - `search`: text search for items

### `POST /menu/items`
- Requires `ADMIN` or `MANAGER`. Creates menu item with preparation time, tax, department.

### `POST /menu/upload`
- Supports Base64 image payload upload.

---

## 4. Orders & Critical KOT/BOT Generation

### `POST /orders`
Creates a restaurant order atomically.
- **Idempotency**: Set header `x-idempotency-key: <uuid>` or body `"idempotencyKey": "<uuid>"`.
- **Atomic KOT/BOT Rule**:
  - Items with `department: "KITCHEN"` generate a **KOT**.
  - Items with `department: "BAR"` generate a **BOT**.
  - Both tickets reference the **same** `orderId`.
  - The table status is set to `OCCUPIED`.
- **Request Body**:
  ```json
  {
    "tableId": "uuid-here",
    "guestCount": 2,
    "orderType": "DINE_IN",
    "idempotencyKey": "mobile-uuid-xyz",
    "notes": "Table near window",
    "items": [
      {
        "menuItemId": "uuid-burger",
        "quantity": 2,
        "notes": "Well done, no mayo"
      },
      {
        "menuItemId": "uuid-mojito",
        "quantity": 1,
        "notes": "Extra lime"
      }
    ]
  }
  ```

### `GET /orders`
- **Query Params**: `status`, `tableId`, `date`.

### `GET /orders/:id`
- Full order details including items, KOTs, BOTs, invoices, and payments.

### `POST /orders/:id/cancel`
- Cancels order, frees up table, and voids tickets.

---

## 5. Kitchen & Bar Display Systems (KDS/BDS)

### `GET /kot` and `GET /bot`
- Query param `active=true` returns live pending/preparing/ready tickets.

### Ticket Status Transitions:
- `POST /kot/:id/accept` (or `/bot/:id/accept`): Marks ticket `ACCEPTED`
- `POST /kot/:id/start` (or `/bot/:id/start`): Marks ticket `PREPARING`
- `POST /kot/:id/ready` (or `/bot/:id/ready`): Marks ticket `READY` (triggers waiter notification)
- `POST /kot/:id/served` (or `/bot/:id/served`): Marks ticket `SERVED`

---

## 6. Payments & Invoices

### `POST /payments`
- **Body**:
  ```json
  {
    "orderId": "uuid-order",
    "amount": 89.50,
    "method": "CASH | CARD | BANK_TRANSFER | QR | MIXED",
    "referenceNumber": "TXN-123456",
    "customerName": "John Doe"
  }
  ```
- Automatically creates Invoice, marks order `COMPLETED`, and sets table to `CLEANING`.

### `GET /invoices`
- List invoices with search and date filters.

### `GET /invoices/:id/pdf`
- Renders standard 80mm thermal receipt HTML for direct receipt printing.

---

## 7. Real-Time WebSocket Events (Socket.IO)

Clients connect to `ws://<SERVER_IP>:3000/socket.io`:

| Event Name | Payload | Trigger |
| :--- | :--- | :--- |
| `order.created` | Full Order object | Waiter/POS creates order |
| `order.updated` | Full Order object | Status/item changed |
| `kot.created` | KOT object with items | New kitchen ticket generated |
| `kot.updated` | KOT object with items | Kitchen accepts, prepares, or finishes item |
| `bot.created` | BOT object with items | New bar ticket generated |
| `bot.updated` | BOT object with items | Bar prepares or finishes drink |
| `table.updated` | Table object | Status change (`AVAILABLE` ↔ `OCCUPIED` ↔ `CLEANING`) |
| `payment.completed` | `{ orderId, invoice, payment }` | Cashier settles bill |

---

## 8. Dashboard & Reports

- `GET /dashboard/stats`: Today's sales, table counts, ticket queues, hourly sales chart, top products.
- `GET /reports/sales`: Date range revenue, tax, discount, daily aggregates, `exportFormat=csv`.
- `GET /reports/products`: Units sold and revenue by item.
- `GET /reports/waiters`: Waiter performance and average ticket size.
- `GET /reports/payments`: Payment methods breakdown.
