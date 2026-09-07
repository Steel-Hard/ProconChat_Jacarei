// Creates and removes only its own temporary database; never resets DB_TEST_URL.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { Client } = require('pg');

async function main() {
    assert.ok(process.env.DB_TEST_URL, 'Set DB_TEST_URL to a PostgreSQL connection with CREATEDB permission');
    const admin = new Client({ connectionString: process.env.DB_TEST_URL });
    const name = `migration_test_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(process.env.DB_TEST_URL);
    url.pathname = `/${name}`;
    let db;
    let created = false;
    function migrate(direction, ...args) {
        const result = spawnSync(process.execPath, [
            require.resolve('node-pg-migrate/bin/node-pg-migrate'), direction,
            '--database-url-var', 'DB_URL', '--migrations-dir', 'db/migrations', ...args,
        ], {
            cwd: path.resolve(__dirname, '..'),
            env: { ...process.env, DB_URL: url.toString() }, encoding: 'utf8',
        });
        assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
    }
    try {
        await admin.connect();
        await admin.query(`CREATE DATABASE ${name}`);
        created = true;
        db = new Client({ connectionString: url.toString() });
        await db.connect();
        migrate('up');
        const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
        assert.deepEqual(tables.rows.map(r => r.tablename), [
            'appointments', 'categories', 'interactions', 'pgmigrations',
            'questions', 'requireddocuments', 'sessions', 'users',
        ]);
        const category = await db.query("INSERT INTO categories(title) VALUES ('Teste') RETURNING id");
        await assert.rejects(db.query("INSERT INTO questions(category_id, question, answer) VALUES (-1, 'Q', 'A')"), { code: '23503' });
        const question = await db.query("INSERT INTO questions(category_id, question, answer) VALUES ($1, 'Q', 'A') RETURNING id", [category.rows[0].id]);
        await db.query("INSERT INTO requireddocuments(question_id, description) VALUES ($1, 'Documento')", [question.rows[0].id]);
        const session = await db.query("INSERT INTO sessions(phone_hash) VALUES ('test-hash') RETURNING id, session_code, status");
        assert.equal(session.rows[0].status, 'IN_PROGRESS');
        assert.ok(session.rows[0].session_code);
        await db.query('INSERT INTO interactions(session_id, category_id, question_id) VALUES ($1, $2, $3)', [session.rows[0].id, category.rows[0].id, question.rows[0].id]);
        const appointment = "INSERT INTO appointments(cpf_hash, name, appointment_reason, professional, appointment_datetime) VALUES ('test-hash', 'Teste', 'Teste', 'LAWYER', '2030-01-01T12:00:00Z')";
        await db.query(appointment);
        await assert.rejects(db.query(appointment), { code: '23505' });
        await db.query("UPDATE appointments SET status = 'CANCELED'");
        await db.query(appointment);
        migrate('up');
        assert.equal((await db.query('SELECT count(*)::int AS n FROM pgmigrations')).rows[0].n, 7);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM categories')).rows[0].n, 1);
        migrate('down', '7');
        assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'")).rows[0].n, 0);
        assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_type WHERE typname IN ('session_status', 'appointment_status')")).rows[0].n, 0);
        migrate('up');
        assert.equal((await db.query('SELECT count(*)::int AS n FROM pgmigrations')).rows[0].n, 7);
        console.log('OK: fresh schema, foreign keys, UUIDs, enums, unique appointments, repeated up, rollback and reapply');
    } finally {
        if (db) await db.end();
        if (created) await admin.query(`DROP DATABASE ${name}`);
        await admin.end();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
