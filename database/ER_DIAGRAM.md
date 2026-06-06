# ER Diagram Description

## Relationship Summary

```text
roles 1 ---< user_roles >--- 1 users
users 1 ---< refresh_tokens
users 1 --- 0..1 verifications
users 1 ---< products >--- 1 categories
products 1 ---< product_images
users 1 ---< notes
products 1 ---< orders >--- 1 users (buyer)
orders 1 ---< order_status_history >--- 1 users (changed_by)
users 1 ---< messages >--- 1 users
products 0..1 ---< messages
orders 1 ---< reviews
users 1 ---< reviews (reviewer)
users 1 ---< reviews (reviewee)
users 1 ---< notifications
```

## Entity Relationships

- **Users and Roles:** `users` and `roles` have a many-to-many relationship through `user_roles`. A user can be both a student and an administrator without repeating role data.
- **Refresh Tokens:** A user can have multiple `refresh_tokens` for active login sessions. Only SHA-256 token hashes are persisted, and individual sessions can be revoked.
- **Student Verification:** Each student can have at most one current `verifications` record. `student_id` identifies the student, while `reviewed_by` identifies the administrator who processed it.
- **Products and Categories:** Each `products` record belongs to one seller and one category. A category can contain many products.
- **Product Images:** A product can have many `product_images`. Images are ordered by `sort_order` and are deleted when their product is deleted.
- **Notes:** A user can upload many `notes`. An administrator may moderate each note through `moderated_by`.
- **Orders:** A buyer can create many `orders` for products. The seller is obtained through `orders.product_id -> products.seller_id`, so seller data is not duplicated in `orders`.
- **Order Tracking:** Every order can have many `order_status_history` rows, each recording the status, actor, timestamp, and optional remarks.
- **Messages:** A message has one sender and one recipient. It may optionally reference a product to retain marketplace context.
- **Reviews:** An order can receive one review per reviewer. The reviewer and reviewee both reference users, allowing buyers and sellers to review each other after a transaction.
- **Notifications:** A user can receive many notifications. Notification read state is stored independently from its message and link.

## Third Normal Form Notes

- Every table has a primary key, and repeating groups such as roles and product images are separated into related tables.
- Non-key columns depend on the whole key. For example, role assignment metadata belongs to the composite key in `user_roles`.
- Transitive and derived data is not stored. User verification status comes from `verifications`, seller identity comes from `products`, and average ratings are calculated from `reviews`.
- Lookup values with their own descriptive attributes, such as roles and categories, are stored once and referenced by foreign keys.
