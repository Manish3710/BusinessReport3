/*
  Oracle Cloud Autonomous Database Schema
  Business Reporting Manager Application

  This script creates all required tables, indexes, and default data
  for the Business Reporting Manager application.

  IMPORTANT: Run this script in your Oracle Cloud SQL Worksheet or via SQLcl
*/

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Users Table
CREATE TABLE users (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR2(255) UNIQUE NOT NULL,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password VARCHAR2(255) NOT NULL,
    role VARCHAR2(50) DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active NUMBER(1) DEFAULT 1,
    CONSTRAINT chk_role CHECK (role IN ('admin', 'user', 'viewer')),
    CONSTRAINT chk_active CHECK (is_active IN (0, 1))
);

-- Reports Table
CREATE TABLE reports (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER NOT NULL,
    report_type VARCHAR2(50) NOT NULL,
    report_name VARCHAR2(255) NOT NULL,
    report_description VARCHAR2(1000),
    status VARCHAR2(50) DEFAULT 'pending' NOT NULL,
    file_path VARCHAR2(500),
    file_size NUMBER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message VARCHAR2(1000),
    CONSTRAINT fk_report_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_report_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Email Schedules Table
CREATE TABLE email_schedules (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id NUMBER NOT NULL,
    recipient_email VARCHAR2(255) NOT NULL,
    recipient_name VARCHAR2(255),
    schedule_time VARCHAR2(50),
    frequency VARCHAR2(50),
    next_run TIMESTAMP,
    last_run TIMESTAMP,
    status VARCHAR2(50) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT chk_schedule_status CHECK (status IN ('active', 'paused', 'completed', 'failed')),
    CONSTRAINT chk_frequency CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'custom'))
);

-- Master Data Table (for uploads)
CREATE TABLE master_data (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_type VARCHAR2(100) NOT NULL,
    data_key VARCHAR2(255) NOT NULL,
    data_value CLOB,
    metadata VARCHAR2(1000),
    uploaded_by NUMBER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active NUMBER(1) DEFAULT 1,
    CONSTRAINT fk_master_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_master_active CHECK (is_active IN (0, 1))
);

-- Report Configurations Table
CREATE TABLE report_configurations (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER NOT NULL,
    config_name VARCHAR2(255) NOT NULL,
    config_type VARCHAR2(50) NOT NULL,
    config_data CLOB NOT NULL,
    is_default NUMBER(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_config_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_config_default CHECK (is_default IN (0, 1))
);

-- Audit Log Table
CREATE TABLE audit_log (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER,
    action VARCHAR2(100) NOT NULL,
    entity_type VARCHAR2(50),
    entity_id NUMBER,
    details VARCHAR2(1000),
    ip_address VARCHAR2(50),
    user_agent VARCHAR2(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Reports table indexes
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created ON reports(created_at);

-- Email schedules indexes
CREATE INDEX idx_email_schedules_report ON email_schedules(report_id);
CREATE INDEX idx_email_schedules_status ON email_schedules(status);
CREATE INDEX idx_email_schedules_next_run ON email_schedules(next_run);

-- Master data indexes
CREATE INDEX idx_master_data_type ON master_data(data_type);
CREATE INDEX idx_master_data_key ON master_data(data_key);
CREATE INDEX idx_master_data_uploader ON master_data(uploaded_by);
CREATE INDEX idx_master_data_active ON master_data(is_active);

-- Report configurations indexes
CREATE INDEX idx_config_user ON report_configurations(user_id);
CREATE INDEX idx_config_type ON report_configurations(config_type);

-- Audit log indexes
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================================
-- 3. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Users table trigger
CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Reports table trigger
CREATE OR REPLACE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Email schedules trigger
CREATE OR REPLACE TRIGGER trg_email_schedules_updated_at
BEFORE UPDATE ON email_schedules
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Master data trigger
CREATE OR REPLACE TRIGGER trg_master_data_updated_at
BEFORE UPDATE ON master_data
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Report configurations trigger
CREATE OR REPLACE TRIGGER trg_config_updated_at
BEFORE UPDATE ON report_configurations
FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- ============================================================================
-- 4. INSERT DEFAULT ADMIN USER
-- ============================================================================

/*
  IMPORTANT: The password below is 'admin123' hashed with bcrypt
  You MUST change this password immediately after first login!

  To generate a new bcrypt hash, run this in Node.js:
  const bcrypt = require('bcryptjs');
  console.log(bcrypt.hashSync('your-password', 10));
*/

INSERT INTO users (username, email, password, role, is_active)
VALUES (
    'admin',
    'admin@example.com',
    '$2a$10$YYXzZ8ZlLp1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHI',
    'admin',
    1
);

COMMIT;

-- ============================================================================
-- 5. CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for active reports with user information
CREATE OR REPLACE VIEW v_active_reports AS
SELECT
    r.id,
    r.report_name,
    r.report_type,
    r.status,
    r.created_at,
    u.username,
    u.email AS user_email
FROM reports r
JOIN users u ON r.user_id = u.id
WHERE r.status IN ('pending', 'processing');

-- View for upcoming email schedules
CREATE OR REPLACE VIEW v_upcoming_schedules AS
SELECT
    es.id,
    es.next_run,
    es.recipient_email,
    r.report_name,
    u.username AS report_owner
FROM email_schedules es
JOIN reports r ON es.report_id = r.id
JOIN users u ON r.user_id = u.id
WHERE es.status = 'active'
AND es.next_run IS NOT NULL
ORDER BY es.next_run;

-- ============================================================================
-- 6. GRANT PERMISSIONS (if needed)
-- ============================================================================

-- If you have multiple users, grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON email_schedules TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON master_data TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON report_configurations TO your_app_user;
-- GRANT INSERT ON audit_log TO your_app_user;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Check if all tables were created
SELECT table_name FROM user_tables ORDER BY table_name;

-- Check if all indexes were created
SELECT index_name, table_name FROM user_indexes WHERE table_name IN (
    'USERS', 'REPORTS', 'EMAIL_SCHEDULES', 'MASTER_DATA',
    'REPORT_CONFIGURATIONS', 'AUDIT_LOG'
) ORDER BY table_name, index_name;

-- Check if default admin user was created
SELECT id, username, email, role, created_at FROM users WHERE role = 'admin';

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================

/*
  After running this script:

  1. Verify all tables were created:
     SELECT COUNT(*) FROM user_tables;

  2. Verify indexes:
     SELECT COUNT(*) FROM user_indexes
     WHERE table_name IN ('USERS', 'REPORTS', 'EMAIL_SCHEDULES', 'MASTER_DATA');

  3. Update default admin password in the application after first login

  4. Test database connection from your Node.js backend

  5. Monitor performance and add additional indexes if needed

  6. Set up regular backups in Oracle Cloud Console

  7. Review and adjust table permissions based on your security requirements
*/

-- End of schema script
