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

## 7. Step-by-Step Photo Upload Flow
- The user selects a photo in the app, which sends an HTTP POST request with the image data to the Load Balancer.
- The Load Balancer routes the request to an available App Server.
- The App Server uploads the original photo directly to Object Storage and receives a unique URL in return.
- The App Server writes the photo's metadata (including the Object Storage URL, user ID, and timestamp) to the Primary Database.
- The App Server publishes a "generate thumbnail" message containing the photo's Object Storage URL to the Message Queue.
- The App Server immediately returns a success response to the user, ensuring a fast, non-blocking UI experience.
- In the background, the Thumbnail Worker picks up the message from the Queue, downloads the original photo from Object Storage, resizes it to 50 KB, and saves the thumbnail back to Object Storage.
- The Worker updates the photo's metadata in the Primary Database with the new thumbnail URL, completing the asynchronous job.

## 8. Trade-offs
- **Trade-off 1: Eventual Consistency vs. Immediate Consistency in Feeds.** Pre-computing feeds (fan-out on write) makes reading extremely fast for the end user, but it introduces a slight delay (eventual consistency) before a new post appears in all followers' feeds, and it consumes significant cache/storage space for celebrity users with millions of followers.
- **Trade-off 2: Synchronous vs. Asynchronous Uploads.** Uploading the image synchronously through the app server guarantees the image is saved before responding, but it blocks the server thread, increases latency, and consumes app server bandwidth. Using direct-to-storage uploads (e.g., via presigned URLs) is much faster and more scalable, but it adds complexity to the client-side implementation and requires careful security validation to prevent unauthorized uploads.