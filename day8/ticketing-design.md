# TicketHub: Event Ticketing System Design

## 1. Requirements
### Functional Requirements
- Users can browse upcoming events and view interactive seat maps.
- Users can temporarily hold a specific seat while proceeding to checkout.
- Users can securely pay for held seats to finalize the purchase.
- Users can view a history of their purchased tickets.

### Non-Functional Requirements
- **Speed:** Page loads and seat map renders must complete in under 2 seconds, even during peak traffic.
- **Correctness:** The system must guarantee zero double-bookings. Payment amounts must be calculated with exact precision.
- **Fairness:** During high-demand sales, the system must treat all human users equally, preventing bots from hoarding inventory and ensuring a first-come, first-served queue.

## 2. Traffic and Capacity Estimates
### Normal Traffic
- **Daily Visitors:** 50,000 users viewing 10 pages each = 500,000 page views/day.
- **Average Read Throughput:** ~6 requests/second.
- **Daily Sales:** 5,000 tickets sold/day (~0.06 writes/second).
- *Conclusion:* Normal traffic is highly read-heavy and easily handled by standard caching.

### "Big Sale" Peak Traffic
- **The Spike:** 200,000 users attempt to buy 20,000 seats within 10 minutes (600 seconds).
- **User Throughput:** ~333 users/second entering the flow.
- **Write Throughput:** If each user attempts to hold a seat, that is ~333 hold requests/second. 
- *Conclusion:* The big sale transforms the system into a **write-heavy, high-concurrency** environment. The primary bottleneck shifts from serving pages to safely processing concurrent seat holds without database deadlocks.

## 3. API Design
- **`GET /api/events`** 
  - *Description:* Browse available events with pagination and filtering.
- **`GET /api/events/{event_id}/seats`** 
  - *Description:* Retrieve the seat map and current availability status for a specific event.
- **`POST /api/seats/{seat_id}/hold`** 
  - *Description:* Atomically place a 10-minute temporary hold on a seat. Returns a `hold_token`.
- **`POST /api/orders`** 
  - *Description:* Finalize the purchase using the `hold_token` and payment details. Converts the hold into a confirmed order.
- **`GET /api/users/{user_id}/tickets`** 
  - *Description:* Retrieve all confirmed tickets for a specific user.

## 4. Data Model
- **`users`**: `id` (PK), `name`, `email`, `created_at`.
- **`events`**: `id` (PK), `title`, `artist`, `venue_id`, `event_date`.
- **`seats`**: `id` (PK), `event_id` (FK), `row_label`, `seat_number`, `status` (available, held, sold).
- **`orders`**: `id` (PK), `user_id` (FK), `seat_id` (FK), `hold_token`, `status` (pending, confirmed, cancelled), `hold_expires_at`, `purchased_at`.
- **Relationships:** One `user` has many `orders`. One `event` has many `seats`. One `seat` has one `order`.

## 5. Preventing Double-Booking
To guarantee absolute correctness and prevent two users from buying the same seat, we use a two-layer concurrency control strategy:
1. **Cache Layer (Redis):** When a user requests to hold a seat, the application uses the Redis `SETNX` (Set if Not eXists) command. This is an atomic operation that instantly claims the seat in memory. If the seat is already held, the command fails immediately, rejecting the second user without hitting the database.
2. **Database Layer (SQL):** When converting a hold to a confirmed order, the database executes a transaction using `SELECT ... FOR UPDATE`. This applies a strict row-level lock on the specific `seats` row. Furthermore, a `UNIQUE` constraint is placed on `seat_id` in the `orders` table (where status = 'confirmed') as an ultimate fail-safe against race conditions.

## 6. Architecture and Survival Strategy
```text
[ Users (Web/Mobile) ]
        │
        ▼
[ CDN ] ─── (Serves static assets and cached seat maps)
        │
        ▼
[ API Gateway / Load Balancer ] ─── (Enforces Virtual Waiting Room & Rate Limiting)
        │
        ▼
[ App Servers ] 
        │
        ├──> [ Redis Cluster ] (Caches seat maps, handles atomic SETNX holds, manages session queues)
        │
        ├──> [ Primary Database ] (Handles transactional writes, row-level locking for orders)
        │       │
        │       └──> [ Read Replicas ] (Handles browsing events and viewing past tickets)
        │
        └──> [ Message Queue ] (Asynchronously processes payment gateway callbacks and email receipts)
```

**Surviving the Big Sale:** 
The system survives the 200,000-user spike by implementing a **Virtual Waiting Room** at the API Gateway. Instead of letting all 200,000 users hit the App Servers simultaneously (which would crash the database), the gateway queues them and only allows a controlled batch (e.g., 5,000 users) into the application flow at a time. Meanwhile, the seat map is served entirely from the CDN and Redis, keeping read latency near zero. The actual "hold" writes are handled by Redis `SETNX`, absorbing the massive write spike in memory before asynchronously flushing confirmed orders to the Primary Database.

## 7. Trade-offs
- **Trade-off 1: Virtual Waiting Room (Fairness vs. User Frustration).** 
  By throttling users into a queue during a big sale, we ensure absolute fairness and protect the database from crashing. However, the trade-off is a degraded user experience; legitimate users may wait in a virtual line for 10-15 minutes before even seeing the seat map, which can lead to frustration and abandoned purchases.
  
- **Trade-off 2: Seat Hold Expiry (Conversion Rate vs. Inventory Lock).** 
  Holding a seat for 10 minutes gives the user ample time to enter payment details, increasing the conversion rate. The trade-off is that it locks inventory. If a user abandons their cart, that seat remains unavailable to others for up to 10 minutes. A shorter hold (e.g., 2 minutes) frees up inventory faster but drastically increases cart abandonment due to user panic.

- **Trade-off 3: Real-Time Seat Map (WebSockets) vs. Cached Seat Map (CDN).** 
  To show users which seats are taken, we can either push live updates via WebSockets or serve a cached, static map via the CDN. Real-time WebSockets provide a flawless UX where users watch seats turn "sold" in real-time, but maintaining 200,000 concurrent, stateful WebSocket connections during a flash sale is incredibly expensive and complex to scale. Conversely, serving a cached seat map from the CDN is infinitely scalable and cheap, but it results in "phantom availability"—users clicking on seats that appear available on the map but are actually already held by someone else, leading to rejection errors at checkout. We choose the cached CDN approach to guarantee system survival, accepting the UX friction of checkout rejections over the risk of total infrastructure collapse. 