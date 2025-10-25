const pg = require('pg');
require('dotenv').config();
const crypto = require('crypto')
const cert = buildCaFromEnv()
const config = {
    user:process.env.AIVEN_USERNAME,
    password: process.env.AIVEN_PASSWORD,
    host: process.env.AIVEN_HOST,
    port: process.env.AIVEN_PORT,
    database: "defaultdb",
    ssl: {
        rejectUnauthorized: true,
        ca: cert
    },
};

function buildCaFromEnv() {
    const ca = process.env.AIVEN_CA;
    if (!ca) return undefined;

    const chunks = [];
    for (let i = 0; i < ca.length; i += 64) {
        chunks.push(ca.slice(i, i + 64));
    }
    return `-----BEGIN CERTIFICATE-----\n${chunks.join('\n')}\n-----END CERTIFICATE-----`;
}

const client = new pg.Client(config);

module.exports = client;
