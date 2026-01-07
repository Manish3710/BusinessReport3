-- Enterprise Reporting System - Stored Procedures
-- Execute this script after creating tables

-- Procedure to authenticate user
CREATE OR REPLACE PROCEDURE SP_AUTHENTICATE_USER (
    p_username IN VARCHAR2,
    p_password_hash IN VARCHAR2,
    p_user_cursor OUT SYS_REFCURSOR,
    p_result OUT VARCHAR2
) AS
BEGIN
    OPEN p_user_cursor FOR
        SELECT USER_ID, USERNAME, EMAIL, FIRST_NAME, LAST_NAME, ROLE, IS_ACTIVE, LAST_LOGIN
        FROM USERS 
        WHERE USERNAME = p_username 
        AND PASSWORD_HASH = p_password_hash 
        AND IS_ACTIVE = 1;
    
    -- Update last login
    UPDATE USERS 
    SET LAST_LOGIN = CURRENT_TIMESTAMP 
    WHERE USERNAME = p_username AND PASSWORD_HASH = p_password_hash;
    
    IF SQL%ROWCOUNT > 0 THEN
        p_result := 'SUCCESS';
        COMMIT;
    ELSE
        p_result := 'INVALID_CREDENTIALS';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to create new user
CREATE OR REPLACE PROCEDURE SP_CREATE_USER (
    p_user_id IN VARCHAR2,
    p_username IN VARCHAR2,
    p_email IN VARCHAR2,
    p_password_hash IN VARCHAR2,
    p_first_name IN VARCHAR2,
    p_last_name IN VARCHAR2,
    p_role IN VARCHAR2 DEFAULT 'user',
    p_created_by IN VARCHAR2,
    p_result OUT VARCHAR2
) AS
    v_count NUMBER;
BEGIN
    -- Check if username already exists
    SELECT COUNT(*) INTO v_count FROM USERS WHERE USERNAME = p_username;
    IF v_count > 0 THEN
        p_result := 'USERNAME_EXISTS';
        RETURN;
    END IF;
    
    -- Check if email already exists
    SELECT COUNT(*) INTO v_count FROM USERS WHERE EMAIL = p_email;
    IF v_count > 0 THEN
        p_result := 'EMAIL_EXISTS';
        RETURN;
    END IF;
    
    INSERT INTO USERS (
        USER_ID, USERNAME, EMAIL, PASSWORD_HASH, FIRST_NAME, LAST_NAME, 
        ROLE, IS_ACTIVE, CREATED_BY
    ) VALUES (
        p_user_id, p_username, p_email, p_password_hash, p_first_name, p_last_name,
        p_role, 1, p_created_by
    );
    
    p_result := 'SUCCESS';
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to get user access rights
CREATE OR REPLACE PROCEDURE SP_GET_USER_ACCESS (
    p_user_id IN VARCHAR2,
    p_access_cursor OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_access_cursor FOR
        SELECT 
            uar.RESOURCE_TYPE,
            uar.RESOURCE_ID,
            uar.ACCESS_LEVEL,
            CASE 
                WHEN uar.RESOURCE_TYPE = 'auto_mail' THEN amr.REPORT_NAME
                WHEN uar.RESOURCE_TYPE = 'instant_report' THEN ir.REPORT_NAME
                WHEN uar.RESOURCE_TYPE = 'master_upload' THEN mu.UPLOAD_NAME
            END AS RESOURCE_NAME
        FROM USER_ACCESS_RIGHTS uar
        LEFT JOIN AUTO_MAIL_REPORTS amr ON uar.RESOURCE_ID = amr.REPORT_ID AND uar.RESOURCE_TYPE = 'auto_mail'
        LEFT JOIN INSTANT_REPORTS ir ON uar.RESOURCE_ID = ir.REPORT_ID AND uar.RESOURCE_TYPE = 'instant_report'
        LEFT JOIN MASTER_UPLOADS mu ON uar.RESOURCE_ID = mu.UPLOAD_ID AND uar.RESOURCE_TYPE = 'master_upload'
        WHERE uar.USER_ID = p_user_id;
END;
/

-- Procedure to create auto mail report
CREATE OR REPLACE PROCEDURE SP_CREATE_AUTO_MAIL_REPORT (
    p_report_id IN VARCHAR2,
    p_report_name IN VARCHAR2,
    p_mail_from IN VARCHAR2,
    p_mail_to IN CLOB,
    p_mail_subject IN VARCHAR2,
    p_mail_body IN CLOB,
    p_query_text IN CLOB,
    p_schedule_type IN VARCHAR2,
    p_schedule_time IN VARCHAR2,
    p_created_by IN VARCHAR2,
    p_result OUT VARCHAR2
) AS
    v_next_run TIMESTAMP;
BEGIN
    -- Calculate next run time based on schedule
    CASE p_schedule_type
        WHEN 'Daily' THEN
            v_next_run := TRUNC(SYSDATE) + 1 + INTERVAL p_schedule_time HOUR TO MINUTE;
        WHEN 'Weekly' THEN
            v_next_run := TRUNC(SYSDATE, 'IW') + 7 + INTERVAL p_schedule_time HOUR TO MINUTE;
        WHEN 'Monthly' THEN
            v_next_run := TRUNC(ADD_MONTHS(SYSDATE, 1), 'MM') + INTERVAL p_schedule_time HOUR TO MINUTE;
        WHEN 'Quarterly' THEN
            v_next_run := TRUNC(ADD_MONTHS(SYSDATE, 3), 'Q') + INTERVAL p_schedule_time HOUR TO MINUTE;
        ELSE
            v_next_run := NULL;
    END CASE;
    
    INSERT INTO AUTO_MAIL_REPORTS (
        REPORT_ID, REPORT_NAME, MAIL_FROM, MAIL_TO, MAIL_SUBJECT, MAIL_BODY,
        QUERY_TEXT, SCHEDULE_TYPE, SCHEDULE_TIME, NEXT_RUN, CREATED_BY
    ) VALUES (
        p_report_id, p_report_name, p_mail_from, p_mail_to, p_mail_subject, p_mail_body,
        p_query_text, p_schedule_type, p_schedule_time, v_next_run, p_created_by
    );
    
    p_result := 'SUCCESS';
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to execute instant report query
CREATE OR REPLACE PROCEDURE SP_EXECUTE_INSTANT_REPORT (
    p_execution_id IN VARCHAR2,
    p_report_id IN VARCHAR2,
    p_user_id IN VARCHAR2,
    p_start_date IN DATE,
    p_end_date IN DATE,
    p_result OUT VARCHAR2,
    p_data_cursor OUT SYS_REFCURSOR
) AS
    v_query CLOB;
    v_final_query CLOB;
BEGIN
    -- Get the query from instant reports
    SELECT QUERY_TEXT INTO v_query FROM INSTANT_REPORTS WHERE REPORT_ID = p_report_id;
    
    -- Replace date parameters
    v_final_query := REPLACE(v_query, ':start_date', '''' || TO_CHAR(p_start_date, 'YYYY-MM-DD') || '''');
    v_final_query := REPLACE(v_final_query, ':end_date', '''' || TO_CHAR(p_end_date, 'YYYY-MM-DD') || '''');
    
    -- Insert execution record
    INSERT INTO QUERY_EXECUTIONS (
        EXECUTION_ID, REPORT_ID, USER_ID, STATUS, PARAMETERS
    ) VALUES (
        p_execution_id, p_report_id, p_user_id, 'running',
        '{"start_date":"' || TO_CHAR(p_start_date, 'YYYY-MM-DD') || '","end_date":"' || TO_CHAR(p_end_date, 'YYYY-MM-DD') || '"}'
    );
    
    -- Execute the dynamic query
    OPEN p_data_cursor FOR v_final_query;
    
    -- Update execution status
    UPDATE QUERY_EXECUTIONS 
    SET STATUS = 'completed', END_TIME = CURRENT_TIMESTAMP 
    WHERE EXECUTION_ID = p_execution_id;
    
    p_result := 'SUCCESS';
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        -- Update execution status with error
        UPDATE QUERY_EXECUTIONS 
        SET STATUS = 'failed', END_TIME = CURRENT_TIMESTAMP, ERROR_MESSAGE = SQLERRM 
        WHERE EXECUTION_ID = p_execution_id;
        
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to grant user access
CREATE OR REPLACE PROCEDURE SP_GRANT_USER_ACCESS (
    p_access_id IN VARCHAR2,
    p_user_id IN VARCHAR2,
    p_resource_type IN VARCHAR2,
    p_resource_id IN VARCHAR2,
    p_access_level IN VARCHAR2,
    p_granted_by IN VARCHAR2,
    p_result OUT VARCHAR2
) AS
BEGIN
    -- Delete existing access if any
    DELETE FROM USER_ACCESS_RIGHTS 
    WHERE USER_ID = p_user_id AND RESOURCE_TYPE = p_resource_type AND RESOURCE_ID = p_resource_id;
    
    -- Insert new access
    INSERT INTO USER_ACCESS_RIGHTS (
        ACCESS_ID, USER_ID, RESOURCE_TYPE, RESOURCE_ID, ACCESS_LEVEL, GRANTED_BY
    ) VALUES (
        p_access_id, p_user_id, p_resource_type, p_resource_id, p_access_level, p_granted_by
    );
    
    p_result := 'SUCCESS';
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to revoke user access
CREATE OR REPLACE PROCEDURE SP_REVOKE_USER_ACCESS (
    p_user_id IN VARCHAR2,
    p_resource_type IN VARCHAR2,
    p_resource_id IN VARCHAR2,
    p_result OUT VARCHAR2
) AS
BEGIN
    DELETE FROM USER_ACCESS_RIGHTS 
    WHERE USER_ID = p_user_id AND RESOURCE_TYPE = p_resource_type AND RESOURCE_ID = p_resource_id;
    
    IF SQL%ROWCOUNT > 0 THEN
        p_result := 'SUCCESS';
    ELSE
        p_result := 'NOT_FOUND';
    END IF;
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to get all users (for admin)
CREATE OR REPLACE PROCEDURE SP_GET_ALL_USERS (
    p_users_cursor OUT SYS_REFCURSOR
) AS
BEGIN
    OPEN p_users_cursor FOR
        SELECT 
            USER_ID, USERNAME, EMAIL, FIRST_NAME, LAST_NAME, ROLE, 
            IS_ACTIVE, CREATED_AT, LAST_LOGIN
        FROM USERS 
        ORDER BY CREATED_AT DESC;
END;
/

-- Procedure to update user status
CREATE OR REPLACE PROCEDURE SP_UPDATE_USER_STATUS (
    p_user_id IN VARCHAR2,
    p_is_active IN NUMBER,
    p_updated_by IN VARCHAR2,
    p_result OUT VARCHAR2
) AS
BEGIN
    UPDATE USERS 
    SET IS_ACTIVE = p_is_active, UPDATED_BY = p_updated_by, UPDATED_AT = CURRENT_TIMESTAMP
    WHERE USER_ID = p_user_id;
    
    IF SQL%ROWCOUNT > 0 THEN
        p_result := 'SUCCESS';
    ELSE
        p_result := 'USER_NOT_FOUND';
    END IF;
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        p_result := 'ERROR: ' || SQLERRM;
        ROLLBACK;
END;
/

-- Procedure to log email sending
CREATE OR REPLACE PROCEDURE SP_LOG_EMAIL (
    p_log_id IN VARCHAR2,
    p_report_id IN VARCHAR2,
    p_report_type IN VARCHAR2,
    p_recipient_email IN VARCHAR2,
    p_subject IN VARCHAR2,
    p_status IN VARCHAR2,
    p_error_message IN CLOB DEFAULT NULL
) AS
BEGIN
    INSERT INTO EMAIL_LOGS (
        LOG_ID, REPORT_ID, REPORT_TYPE, RECIPIENT_EMAIL, SUBJECT, STATUS, ERROR_MESSAGE, SENT_AT
    ) VALUES (
        p_log_id, p_report_id, p_report_type, p_recipient_email, p_subject, p_status, p_error_message,
        CASE WHEN p_status = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END
    );
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
END;
/

-- Function to generate unique ID
CREATE OR REPLACE FUNCTION FN_GENERATE_ID (p_prefix VARCHAR2) RETURN VARCHAR2 AS
    v_id VARCHAR2(50);
BEGIN
    CASE p_prefix
        WHEN 'USR' THEN
            SELECT p_prefix || SEQ_USER_ID.NEXTVAL INTO v_id FROM DUAL;
        WHEN 'RPT' THEN
            SELECT p_prefix || SEQ_REPORT_ID.NEXTVAL INTO v_id FROM DUAL;
        WHEN 'UPL' THEN
            SELECT p_prefix || SEQ_UPLOAD_ID.NEXTVAL INTO v_id FROM DUAL;
        WHEN 'ACC' THEN
            SELECT p_prefix || SEQ_ACCESS_ID.NEXTVAL INTO v_id FROM DUAL;
        WHEN 'EXE' THEN
            SELECT p_prefix || SEQ_EXECUTION_ID.NEXTVAL INTO v_id FROM DUAL;
        WHEN 'LOG' THEN
            SELECT p_prefix || SEQ_LOG_ID.NEXTVAL INTO v_id FROM DUAL;
        ELSE
            v_id := p_prefix || TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS');
    END CASE;
    
    RETURN v_id;
END;
/