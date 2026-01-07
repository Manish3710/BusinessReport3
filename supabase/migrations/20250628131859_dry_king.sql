-- Sample data for testing
-- Execute this script after creating tables and procedures

-- Sample Auto Mail Reports
INSERT INTO AUTO_MAIL_REPORTS (
    REPORT_ID, REPORT_NAME, MAIL_FROM, MAIL_TO, MAIL_SUBJECT, MAIL_BODY,
    QUERY_TEXT, SCHEDULE_TYPE, SCHEDULE_TIME, CREATED_BY
) VALUES (
    'RPT1001', 'Daily Sales Report', 'reports@company.com', 
    '["sales@company.com", "manager@company.com"]',
    'Daily Sales Summary - {{DATE}}',
    'Please find attached the daily sales report for {{DATE}}.',
    'SELECT product_name, SUM(quantity) as total_qty, SUM(amount) as total_amount FROM sales WHERE sale_date = TRUNC(SYSDATE) GROUP BY product_name',
    'Daily', '09:00', 'USR1000'
);

INSERT INTO AUTO_MAIL_REPORTS (
    REPORT_ID, REPORT_NAME, MAIL_FROM, MAIL_TO, MAIL_SUBJECT, MAIL_BODY,
    QUERY_TEXT, SCHEDULE_TYPE, SCHEDULE_TIME, CREATED_BY
) VALUES (
    'RPT1002', 'Weekly Inventory Report', 'reports@company.com',
    '["inventory@company.com"]',
    'Weekly Inventory Status',
    'Weekly inventory status report is attached.',
    'SELECT product_id, product_name, current_stock, reorder_level FROM inventory WHERE current_stock <= reorder_level',
    'Weekly', '08:00', 'USR1000'
);

-- Sample Instant Reports
INSERT INTO INSTANT_REPORTS (
    REPORT_ID, REPORT_NAME, QUERY_TEXT, CREATED_BY
) VALUES (
    'RPT1003', 'Customer Sales Analysis',
    'SELECT c.customer_name, COUNT(s.sale_id) as total_orders, SUM(s.amount) as total_amount FROM customers c JOIN sales s ON c.customer_id = s.customer_id WHERE s.sale_date BETWEEN :start_date AND :end_date GROUP BY c.customer_name ORDER BY total_amount DESC',
    'USR1000'
);

INSERT INTO INSTANT_REPORTS (
    REPORT_ID, REPORT_NAME, QUERY_TEXT, CREATED_BY
) VALUES (
    'RPT1004', 'Product Performance Report',
    'SELECT p.product_name, SUM(s.quantity) as units_sold, SUM(s.amount) as revenue FROM products p JOIN sales s ON p.product_id = s.product_id WHERE s.sale_date BETWEEN :start_date AND :end_date GROUP BY p.product_name ORDER BY revenue DESC',
    'USR1000'
);

-- Sample Master Uploads
INSERT INTO MASTER_UPLOADS (
    UPLOAD_ID, UPLOAD_NAME, TABLE_NAME, COLUMN_MAPPING, VALIDATION_RULES, CREATED_BY
) VALUES (
    'UPL1001', 'Product Master Upload', 'PRODUCTS',
    '{"Product ID":"PRODUCT_ID","Product Name":"PRODUCT_NAME","Category":"CATEGORY","Price":"PRICE","Stock Quantity":"STOCK_QUANTITY"}',
    '[{"column":"PRODUCT_ID","type":"required","message":"Product ID is required"},{"column":"PRODUCT_NAME","type":"required","message":"Product Name is required"},{"column":"PRICE","type":"dataType","value":"number","message":"Price must be a number"}]',
    'USR1000'
);

INSERT INTO MASTER_UPLOADS (
    UPLOAD_ID, UPLOAD_NAME, TABLE_NAME, COLUMN_MAPPING, VALIDATION_RULES, CREATED_BY
) VALUES (
    'UPL1002', 'Customer Master Upload', 'CUSTOMERS',
    '{"Customer ID":"CUSTOMER_ID","Customer Name":"CUSTOMER_NAME","Email":"EMAIL","Phone":"PHONE","Address":"ADDRESS"}',
    '[{"column":"CUSTOMER_ID","type":"required","message":"Customer ID is required"},{"column":"CUSTOMER_NAME","type":"required","message":"Customer Name is required"},{"column":"EMAIL","type":"custom","value":"email","message":"Valid email is required"}]',
    'USR1000'
);

-- Grant access to sample user for some reports
INSERT INTO USER_ACCESS_RIGHTS (ACCESS_ID, USER_ID, RESOURCE_TYPE, RESOURCE_ID, ACCESS_LEVEL, GRANTED_BY)
VALUES ('ACC1001', 'USR1001', 'instant_report', 'RPT1003', 'execute', 'USR1000');

INSERT INTO USER_ACCESS_RIGHTS (ACCESS_ID, USER_ID, RESOURCE_TYPE, RESOURCE_ID, ACCESS_LEVEL, GRANTED_BY)
VALUES ('ACC1002', 'USR1001', 'master_upload', 'UPL1001', 'execute', 'USR1000');

-- Sample tables for testing (you can modify these based on your actual business tables)
CREATE TABLE PRODUCTS (
    PRODUCT_ID VARCHAR2(50) PRIMARY KEY,
    PRODUCT_NAME VARCHAR2(255) NOT NULL,
    CATEGORY VARCHAR2(100),
    PRICE NUMBER(10,2),
    STOCK_QUANTITY NUMBER DEFAULT 0,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CUSTOMERS (
    CUSTOMER_ID VARCHAR2(50) PRIMARY KEY,
    CUSTOMER_NAME VARCHAR2(255) NOT NULL,
    EMAIL VARCHAR2(255),
    PHONE VARCHAR2(20),
    ADDRESS CLOB,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SALES (
    SALE_ID VARCHAR2(50) PRIMARY KEY,
    CUSTOMER_ID VARCHAR2(50),
    PRODUCT_ID VARCHAR2(50),
    QUANTITY NUMBER NOT NULL,
    AMOUNT NUMBER(10,2) NOT NULL,
    SALE_DATE DATE DEFAULT TRUNC(SYSDATE),
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_SALES_CUSTOMER FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMERS(CUSTOMER_ID),
    CONSTRAINT FK_SALES_PRODUCT FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(PRODUCT_ID)
);

CREATE TABLE INVENTORY (
    PRODUCT_ID VARCHAR2(50) PRIMARY KEY,
    PRODUCT_NAME VARCHAR2(255) NOT NULL,
    CURRENT_STOCK NUMBER DEFAULT 0,
    REORDER_LEVEL NUMBER DEFAULT 10,
    LAST_UPDATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_INVENTORY_PRODUCT FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCTS(PRODUCT_ID)
);

-- Insert sample data
INSERT INTO PRODUCTS VALUES ('P001', 'Laptop Computer', 'Electronics', 999.99, 50, CURRENT_TIMESTAMP);
INSERT INTO PRODUCTS VALUES ('P002', 'Wireless Mouse', 'Electronics', 29.99, 100, CURRENT_TIMESTAMP);
INSERT INTO PRODUCTS VALUES ('P003', 'Office Chair', 'Furniture', 199.99, 25, CURRENT_TIMESTAMP);

INSERT INTO CUSTOMERS VALUES ('C001', 'John Doe', 'john@example.com', '123-456-7890', '123 Main St, City, State', CURRENT_TIMESTAMP);
INSERT INTO CUSTOMERS VALUES ('C002', 'Jane Smith', 'jane@example.com', '098-765-4321', '456 Oak Ave, City, State', CURRENT_TIMESTAMP);

INSERT INTO SALES VALUES ('S001', 'C001', 'P001', 1, 999.99, TRUNC(SYSDATE), CURRENT_TIMESTAMP);
INSERT INTO SALES VALUES ('S002', 'C002', 'P002', 2, 59.98, TRUNC(SYSDATE), CURRENT_TIMESTAMP);
INSERT INTO SALES VALUES ('S003', 'C001', 'P003', 1, 199.99, TRUNC(SYSDATE-1), CURRENT_TIMESTAMP);

INSERT INTO INVENTORY VALUES ('P001', 'Laptop Computer', 49, 10, CURRENT_TIMESTAMP);
INSERT INTO INVENTORY VALUES ('P002', 'Wireless Mouse', 98, 20, CURRENT_TIMESTAMP);
INSERT INTO INVENTORY VALUES ('P003', 'Office Chair', 24, 5, CURRENT_TIMESTAMP);

COMMIT;