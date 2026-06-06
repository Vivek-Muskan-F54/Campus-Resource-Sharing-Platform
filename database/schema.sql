-- Campus Resource Sharing Platform
-- MySQL 8.0.16+ schema normalized to Third Normal Form (3NF).

CREATE DATABASE IF NOT EXISTS campus_share
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE campus_share;

CREATE TABLE roles (
    role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_name VARCHAR(30) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id),
    CONSTRAINT uq_roles_role_name UNIQUE (role_name)
) ENGINE = InnoDB;

CREATE TABLE users (
    user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    college_roll_number VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_college_roll_number UNIQUE (college_roll_number)
) ENGINE = InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles (role_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE refresh_tokens (
    refresh_token_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (refresh_token_id),
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE verifications (
    verification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    student_id BIGINT UNSIGNED NOT NULL,
    id_card_url VARCHAR(500) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    admin_remarks VARCHAR(500) NULL,
    reviewed_by BIGINT UNSIGNED NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (verification_id),
    CONSTRAINT uq_verifications_student UNIQUE (student_id),
    CONSTRAINT fk_verifications_student
        FOREIGN KEY (student_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_verifications_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_verifications_review
        CHECK (
            (status = 'PENDING' AND reviewed_at IS NULL)
            OR (status IN ('APPROVED', 'REJECTED') AND reviewed_at IS NOT NULL)
        )
) ENGINE = InnoDB;

CREATE TABLE categories (
    category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(80) NOT NULL,
    description VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (category_id),
    CONSTRAINT uq_categories_category_name UNIQUE (category_name)
) ENGINE = InnoDB;

CREATE TABLE products (
    product_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    seller_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(140) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    transaction_type ENUM('SELL', 'RENT', 'EXCHANGE') NOT NULL,
    item_condition ENUM('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR') NOT NULL,
    status ENUM('ACTIVE', 'RESERVED', 'COMPLETED', 'REJECTED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    CONSTRAINT fk_products_seller
        FOREIGN KEY (seller_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES categories (category_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_products_price CHECK (price >= 0)
) ENGINE = InnoDB;

CREATE TABLE product_images (
    product_image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    public_id VARCHAR(255) NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_image_id),
    CONSTRAINT uq_product_images_order UNIQUE (product_id, sort_order),
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE notes (
    note_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    uploader_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(140) NOT NULL,
    branch VARCHAR(80) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    semester TINYINT UNSIGNED NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    public_id VARCHAR(255) NULL,
    original_filename VARCHAR(255) NULL,
    content_type VARCHAR(100) NULL,
    file_size BIGINT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    moderated_by BIGINT UNSIGNED NULL,
    moderation_remarks VARCHAR(500) NULL,
    moderated_at TIMESTAMP NULL,
    download_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id),
    CONSTRAINT fk_notes_uploader
        FOREIGN KEY (uploader_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_notes_moderator
        FOREIGN KEY (moderated_by) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_notes_semester CHECK (semester BETWEEN 1 AND 12),
    CONSTRAINT chk_notes_moderation
        CHECK (
            (status = 'PENDING' AND moderated_at IS NULL)
            OR (status IN ('APPROVED', 'REJECTED') AND moderated_at IS NOT NULL)
        )
) ENGINE = InnoDB;

CREATE TABLE orders (
    order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    buyer_id BIGINT UNSIGNED NOT NULL,
    seller_id BIGINT UNSIGNED NOT NULL,
    status ENUM(
        'REQUESTED',
        'APPROVED',
        'REJECTED',
        'READY_FOR_HANDOVER',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'REQUESTED',
    buyer_message VARCHAR(1000) NULL,
    handover_token_hash CHAR(64) NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    CONSTRAINT uq_orders_handover_token_hash UNIQUE (handover_token_hash),
    CONSTRAINT fk_orders_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_buyer
        FOREIGN KEY (buyer_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_seller
        FOREIGN KEY (seller_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_orders_completed_at
        CHECK (
            (status = 'COMPLETED' AND completed_at IS NOT NULL)
            OR (status <> 'COMPLETED')
        )
) ENGINE = InnoDB;

CREATE TABLE order_status_history (
    order_status_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    status ENUM(
        'REQUESTED',
        'APPROVED',
        'REJECTED',
        'READY_FOR_HANDOVER',
        'COMPLETED',
        'CANCELLED'
    ) NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,
    remarks VARCHAR(500) NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_status_history_id),
    CONSTRAINT fk_order_status_history_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_status_history_user
        FOREIGN KEY (changed_by) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE messages (
    message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id BIGINT UNSIGNED NOT NULL,
    recipient_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    message_text VARCHAR(2000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    PRIMARY KEY (message_id),
    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_messages_recipient
        FOREIGN KEY (recipient_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_messages_product
        FOREIGN KEY (product_id) REFERENCES products (product_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_messages_participants CHECK (sender_id <> recipient_id),
    CONSTRAINT chk_messages_read_at
        CHECK (
            (is_read = FALSE AND read_at IS NULL)
            OR (is_read = TRUE AND read_at IS NOT NULL)
        )
) ENGINE = InnoDB;

CREATE TABLE reviews (
    review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id BIGINT UNSIGNED NOT NULL,
    reviewer_id BIGINT UNSIGNED NOT NULL,
    reviewee_id BIGINT UNSIGNED NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    CONSTRAINT uq_reviews_order_reviewer UNIQUE (order_id, reviewer_id),
    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id) REFERENCES orders (order_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_reviewer
        FOREIGN KEY (reviewer_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_reviewee
        FOREIGN KEY (reviewee_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_participants CHECK (reviewer_id <> reviewee_id)
) ENGINE = InnoDB;

CREATE TABLE notifications (
    notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    recipient_id BIGINT UNSIGNED NOT NULL,
    notification_type ENUM('MESSAGE', 'ORDER', 'VERIFICATION', 'SYSTEM') NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(500) NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    PRIMARY KEY (notification_id),
    CONSTRAINT fk_notifications_recipient
        FOREIGN KEY (recipient_id) REFERENCES users (user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_notifications_read_at
        CHECK (
            (is_read = FALSE AND read_at IS NULL)
            OR (is_read = TRUE AND read_at IS NOT NULL)
        )
) ENGINE = InnoDB;

-- Search, filtering, ownership, and timeline indexes.
CREATE INDEX idx_user_roles_role ON user_roles (role_id, user_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, is_revoked);
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens (expires_at);
CREATE INDEX idx_verifications_status ON verifications (status, submitted_at);
CREATE INDEX idx_products_search ON products (status, category_id, transaction_type, item_condition, price);
CREATE FULLTEXT INDEX idx_products_title_description ON products (title, description);
CREATE INDEX idx_products_seller_created ON products (seller_id, created_at);
CREATE INDEX idx_notes_filter ON notes (status, branch, semester, subject);
CREATE INDEX idx_notes_uploader_created ON notes (uploader_id, created_at);
CREATE INDEX idx_orders_buyer_status ON orders (buyer_id, status, requested_at);
CREATE INDEX idx_orders_seller_status ON orders (seller_id, status, requested_at);
CREATE INDEX idx_orders_product_status ON orders (product_id, status, requested_at);
CREATE INDEX idx_order_status_history_order_time ON order_status_history (order_id, changed_at);
CREATE INDEX idx_messages_conversation_sent ON messages (sender_id, recipient_id, sent_at);
CREATE INDEX idx_messages_recipient_read ON messages (recipient_id, is_read, sent_at);
CREATE INDEX idx_reviews_reviewee_created ON reviews (reviewee_id, created_at);
CREATE INDEX idx_notifications_recipient_read ON notifications (recipient_id, is_read, created_at);

INSERT INTO roles (role_name, description)
VALUES
    ('ADMIN', 'Platform administrator'),
    ('STUDENT', 'Verified college student')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO categories (category_name, description)
VALUES
    ('Books', 'Textbooks, reference books, and exam preparation books'),
    ('Lab Kits', 'Laboratory kits and practical equipment'),
    ('Calculators', 'Scientific and graphing calculators'),
    ('Electronics', 'Student-use electronic devices and accessories'),
    ('Project Components', 'Components used for academic projects'),
    ('Other', 'Other approved campus resources')
ON DUPLICATE KEY UPDATE description = VALUES(description);
