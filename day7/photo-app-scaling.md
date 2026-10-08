# SnapShare Scaling Plan

## 1. Assumptions and Daily Active Users (DAU)
- **Total Registered Users:** 10,000,000
- **Daily Active User (DAU) Rate:** 10%
- **Daily Active Users (DAU):** 10,000,000 × 0.10 = **1,000,000 DAU**
- **Upload Behavior:** Each active user uploads 1 photo per day.
- **Read Behavior:** Each active user views 50 feed pages per day.
- **File Sizes:** Average original photo = 2 MB; Average thumbnail = 50 KB (0.05 MB). Total storage per upload = 2.05 MB.

## 2. Traffic and Storage Estimates
- **Uploads per Day:** 1,000,000 uploads
  - **Average Uploads per Second:** 1,000,000 / 86,400 seconds ≈ **12 uploads/sec**
  - **Peak Uploads per Second (5×):** 12 × 5 = **60 uploads/sec**
- **Feed Views per Day:** 1,000,000 DAU × 50 pages = 50,000,000 views
  - **Average Feed Views per Second:** 50,000,000 / 86,400 seconds ≈ **579 views/sec**
  - **Peak Feed Views per Second (5×):** 579 × 5 = **2,895 views/sec**
- **Storage per Year:** 1,000,000 uploads/day × 2.05 MB/upload × 365 days ≈ **748 TB/year**

## 3. Read-Heavy vs. Write-Heavy System
SnapShare is fundamentally a **read-heavy system** (approximately 50 read operations for every 1 write operation). This dictates that the architecture must be heavily optimized for read throughput and low latency. The design will prioritize caching strategies (like pre-computed feeds), Content Delivery Networks (CDNs) for static assets, and database read replicas to ensure the system can handle thousands of concurrent read requests without bottlenecking the primary database.

## 4. Why Photos Should Not Be Stored in the Database
Relational databases are optimized for structured metadata and fast indexing, not for storing large binary large objects (BLOBs). Storing photos directly in the database would bloat the storage, drastically slow down backup and recovery times, increase memory pressure, and make horizontal scaling prohibitively expensive. Instead, photos should be stored in **Object Storage** (e.g., AWS S3, Google Cloud Storage), which is specifically designed for cheap, highly durable, and infinitely scalable storage of unstructured binary data, while the database only stores the metadata and the URL pointing to the object.

## 5. Architecture Diagram (Text-Based)

```text
[ User (Mobile/Web) ]
        │
        ▼
[ CDN ] ──────────────────────────────────────────────────────────────┐
        │ (Serves cached images and static assets)                    │
        ▼                                                             │
[ Load Balancer ]                                                     │
        │ (Distributes incoming traffic)                              │
        ▼                                                             │
[ App Servers ] ◄─────────────────────────────────────────────────────┤
        │                                                             │
        ├──> [ Cache (Redis) ] (Stores pre-computed feeds & sessions) │
        │                                                             │
        ├──> [ Primary Database ] (Handles writes & metadata)         │
        │        │                                                    │
        │        └──> [ Read Replica Database ] (Handles feed reads)  │
        │                                                             │
        └──> [ Message Queue ] (e.g., RabbitMQ/Kafka)                 │
                   │                                                  │
                   ▼                                                  │
            [ Thumbnail Worker ] (Background job processor)           │
                   │                                                  │
                   └──────────────────────────────────> [ Object Storage ] 
                                                        (Original Photos & Thumbnails)
```
## 6. Component Explanations
- **CDN:** Caches and serves static assets and images globally to reduce latency and offload traffic from origin servers.
- **Load Balancer:** Distributes incoming network traffic across multiple app servers to ensure high availability and prevent any single server from being overwhelmed.
- **App Servers:** Execute the core business logic, handle API requests, and coordinate interactions between the database, cache, and object storage.
- **Cache:** Stores frequently accessed data (like pre-computed user feeds) in memory to drastically reduce database load and improve response times.
- **Primary Database:** Acts as the single source of truth for structured metadata, handling all write operations and critical transactional data.
- **Read Replica Database:** Offloads read-heavy queries (like fetching feed data) from the primary database to improve overall read throughput and availability.
- **Message Queue:** Decouples the upload process from thumbnail generation, allowing the app server to respond quickly to the user while background processing occurs.
- **Thumbnail Worker:** Asynchronously consumes messages from the queue to resize original photos into thumbnails, preventing CPU-intensive tasks from blocking the main application.
- **Object Storage:** Provides a highly durable, scalable, and cost-effective solution for storing large, unstructured binary files like original photos and generated thumbnails.

## 7. Step-by-Step Photo Upload Flow (Including Background Processing)
1. The user selects a photo, and the App Server receives the HTTP POST request.
2. The App Server uploads the 2 MB original photo directly to Object Storage and receives a unique URL.
3. The App Server writes the photo's metadata (user ID, timestamp, original URL) to the Primary Database.
4. The App Server publishes a "generate thumbnail" message containing the photo's Object Storage URL to the Message Queue.
5. The App Server immediately returns an HTTP 200 OK success response to the user, ensuring a fast, non-blocking UI experience.
6. **Background Processing Begins:** The Thumbnail Worker (running on separate, dedicated compute instances) continuously polls the Message Queue for new jobs.
7. The Worker pulls the message, downloads the 2 MB original photo from Object Storage into its memory.
8. The Worker processes the image, resizing and compressing it into a 50 KB thumbnail.
9. The Worker uploads the newly generated 50 KB thumbnail back to Object Storage.
10. Finally, the Worker updates the photo's metadata in the Primary Database with the new thumbnail URL, completing the asynchronous job. *(Note: If the worker fails at any step, the message remains in the queue or moves to a dead-letter queue for automatic retry, ensuring no thumbnails are lost).*

## 8. Trade-offs
- **Trade-off 1: Eventual Consistency (Read Replicas) vs. Strict Read Consistency.** 
  By using Read Replicas to handle the massive volume of feed views, we introduce *replication lag*. This means if a user uploads a photo and immediately refreshes their feed, the photo might not appear instantly (Eventual Consistency). We are trading strict, immediate read consistency for massive gains in read scalability and system availability. If we demanded strict consistency, all reads would have to hit the Primary Database, creating a severe bottleneck that would crash the system under peak load.
  
- **Trade-off 2: Fan-out on Write (Push) vs. Fan-out on Read (Pull) for Feed Generation.** 
  To build a user's feed, we can either "fan-out on write" (push the new photo ID into every follower's pre-computed cache the moment it is uploaded) or "fan-out on read" (query the database for all followed users' posts when the user opens the app). Fan-out on write makes reading the feed blazing fast (O(1) cache lookup) but makes uploading incredibly slow and resource-intensive for users with millions of followers. Fan-out on read makes uploading instant but makes reading the feed very slow and database-heavy. We must explicitly trade off write latency and cache storage space for read latency.