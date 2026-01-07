const oracledb = require('oracledb');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

const dbConfig = {
    user: process.env.ORACLE_USER || process.env.DB_USER || 'ADMIN',
    password: process.env.ORACLE_PASSWORD || process.env.DB_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING || process.env.DB_CONNECT_STRING,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60,
    stmtCacheSize: 30
};

if (process.env.ORACLE_WALLET_LOCATION) {
    dbConfig.walletLocation = process.env.ORACLE_WALLET_LOCATION;
}

if (process.env.ORACLE_WALLET_PASSWORD) {
    dbConfig.walletPassword = process.env.ORACLE_WALLET_PASSWORD;
}

if (process.env.DB_USER && process.env.DB_USER.includes('sysdba')) {
    dbConfig.privilege = 2;
}

let pool;

async function initialize() {
    try {
        pool = await oracledb.createPool(dbConfig);
        console.log('Oracle Database connection pool created successfully');
    } catch (err) {
        console.error('Error creating Oracle Database connection pool:', err);
        throw err;
    }
}

async function close() {
    try {
        if (pool) {
            await pool.close(10);
            console.log('Oracle Database connection pool closed');
        }
    } catch (err) {
        console.error('Error closing Oracle Database connection pool:', err);
    }
}

async function getConnection() {
    try {
        return await pool.getConnection();
    } catch (err) {
        console.error('Error getting database connection:', err);
        throw err;
    }
}

// Execute query with parameters
async function executeQuery(sql, params = []) {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, params);
        return result;
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

// Execute stored procedure
async function executeProcedure(procedureName, params = {}) {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(procedureName, params);
        return result;
    } catch (err) {
        console.error('Stored procedure execution error:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

module.exports = {
    initialize,
    close,
    getConnection,
    executeQuery,
    executeProcedure,
    oracledb
};