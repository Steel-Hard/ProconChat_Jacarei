const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const backendDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(__dirname, 'migrations');
const hex64 = 'a'.repeat(64);
const otherHex64 = 'b'.repeat(64);
const encrypted = 'v1:aXY=:dGFn:Y2lwaGVy';

const expectedTables = [
    'appointmentevents', 'appointmentnotes', 'appointments', 'attendancedocuments', 'blockeddates',
    'categories', 'conversationevents', 'pgmigrations', 'questions', 'requireddocuments',
    'scheduleranges', 'schedulesettings', 'sessions', 'users', 'whatsappsettings',
];
const expectedEnums = {
    appointment_status: ['PENDING', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELED'],
    appointment_reason: ['REQUIRES_IN_PERSON', 'NOT_RESOLVED'],
    attendee_group: ['HOLDER', 'REPRESENTATIVE'],
    session_status: ['IN_PROGRESS', 'FINISHED', 'ABANDONED'],
    session_outcome: ['IN_PROGRESS', 'RESOLVED', 'SCHEDULED', 'OUT_OF_SCOPE', 'NO_SLOT', 'DECLINED', 'MANAGED_APPOINTMENT', 'ABANDONED'],
    session_step: [
        'AWAITING_CATEGORY', 'AWAITING_QUESTION', 'AWAITING_ANSWER', 'AWAITING_RESOLVED', 'AWAITING_SCHEDULE_OFFER',
        'AWAITING_ATTENDEE', 'AWAITING_HOLDER_NAME', 'AWAITING_HOLDER_CPF', 'AWAITING_SLOT', 'AWAITING_RETURN_CHOICE',
        'AWAITING_CANCEL_CONFIRMATION', 'FINISHED',
    ],
    conversation_event_type: [
        'STARTED', 'CATEGORY_CHOSEN', 'QUESTION_CHOSEN', 'ANSWER_SENT', 'RESOLVED_ANSWERED', 'SCHEDULE_OFFERED', 'NO_SLOT',
        'SCHEDULE_DECLINED', 'ATTENDEE_CHOSEN', 'PHONE_NOTICE_SHOWN', 'APPOINTMENT_CREATED', 'APPOINTMENT_CONSULTED',
        'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_CANCELED', 'ABANDONED',
    ],
    appointment_event_type: [
        'CREATED', 'CLAIMED', 'ASSIGNED', 'RESCHEDULED', 'BACK_TO_PENDING', 'ATTENDED', 'NO_SHOW', 'RECORD_CORRECTED',
        'CANCELED_BY_CITIZEN', 'CANCELED_BY_STAFF', 'CITIZEN_NOTIFIED', 'CITIZEN_NOTIFICATION_FAILED', 'REMINDER_SENT',
        'KEPT_OFF_GRID',
    ],
};

function run(args, url) {
    return spawnSync(process.execPath, args, {
        cwd: backendDir,
        env: { ...process.env, DB_URL: url },
        encoding: 'utf8',
    });
}

function migrate(url, direction, ...args) {
    return run([
        require.resolve('node-pg-migrate/bin/node-pg-migrate'), direction,
        '--database-url-var', 'DB_URL', '--migrations-dir', 'db/migrations', ...args,
    ], url);
}

function mustMigrate(url, direction, ...args) {
    const result = migrate(url, direction, ...args);
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
}

function mustSeed(url) {
    const result = run([require.resolve('ts-node/dist/bin.js'), 'db/seeds/run.ts'], url);
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
    assert.match(result.stdout, /Seed concluído/);
    return result.stdout;
}

function seedData() {
    require('ts-node').register({ transpileOnly: true });
    return {
        faq: require('./seeds/data/procon-faq.data').default,
        config: require('./seeds/data/configuracao-inicial.data').default,
    };
}

async function seedVersion10(db) {
    const seed = seedData().faq;
    for (const category of seed) {
        const categoryId = (await db.query(
            'INSERT INTO Categories (title, description, active) VALUES ($1, $2, true) RETURNING id',
            [category.title, category.description],
        )).rows[0].id;
        for (const question of category.questions) {
            const questionId = (await db.query(
                `INSERT INTO Questions (category_id, question, legal_basis, answer, requires_in_person, out_of_scope, active)
                 VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
                [categoryId, question.question, question.legalBasis, question.answer, question.requiresInPerson, question.outOfScope ?? false],
            )).rows[0].id;
            for (const document of question.requiredDocuments) {
                await db.query('INSERT INTO RequiredDocuments (question_id, description) VALUES ($1, $2)', [questionId, document]);
            }
        }
    }
}

async function count(db, sql, params = []) {
    return (await db.query(`SELECT count(*)::int AS n FROM (${sql}) AS x`, params)).rows[0].n;
}

async function rejects(db, sql, params, code) {
    await assert.rejects(db.query(sql, params), error => {
        assert.equal(error.code, code, `${sql} -> ${error.code} ${error.message}`);
        return true;
    });
}

async function enumValues(db, name) {
    const result = await db.query(
        'SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = $1 ORDER BY e.enumsortorder',
        [name],
    );
    return result.rows.map(r => r.enumlabel);
}

async function tableNames(db) {
    const result = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    return result.rows.map(r => r.tablename);
}

async function column(db, table, name) {
    const result = await db.query(
        'SELECT data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3',
        ['public', table, name],
    );
    return result.rows[0];
}

async function withDatabase(admin, baseUrl, fn) {
    const name = `migration_test_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(baseUrl);
    url.pathname = `/${name}`;
    await admin.query(`CREATE DATABASE ${name}`);
    const db = new Client({ connectionString: url.toString() });
    try {
        await db.connect();
        await fn(db, url.toString());
    } finally {
        await db.end();
        await admin.query(`DROP DATABASE ${name}`);
    }
}

function checkMigrationFile() {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    assert.equal(files.length, 12);
    for (const file of ['11_sprint2_schema.sql', '12_short_text_checks.sql']) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        assert.doesNotMatch(sql, /add\s+value/i, file);
        assert.match(sql, /^-- Up Migration/, file);
        assert.match(sql, /\n-- Down Migration\n/, file);
    }
}

async function checkFreshSchema(db) {
    assert.deepEqual(await tableNames(db), expectedTables);
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
    for (const [name, values] of Object.entries(expectedEnums)) {
        assert.deepEqual(await enumValues(db, name), values, name);
    }
    assert.deepEqual(await column(db, 'users', 'session_version'), { data_type: 'integer', is_nullable: 'NO', column_default: '0' });
    assert.equal((await column(db, 'categories', 'short_title')).is_nullable, 'NO');
    assert.equal((await column(db, 'questions', 'short_title')).is_nullable, 'NO');
    assert.equal((await column(db, 'questions', 'short_description')).is_nullable, 'YES');
    assert.equal((await column(db, 'sessions', 'outcome')).is_nullable, 'NO');
    assert.equal(await count(db, "SELECT 1 FROM pg_extension WHERE extname = 'unaccent'"), 1);
    assert.equal((await db.query("SELECT unaccent('Cobrança Vício') AS v")).rows[0].v, 'Cobranca Vicio');
}

async function checkConstraints(db) {
    const admin = (await db.query("INSERT INTO users(name, email, password_hash, is_admin) VALUES ('Admin', 'admin@test', 'x', true) RETURNING id")).rows[0].id;
    const staff = (await db.query("INSERT INTO users(name, email, password_hash) VALUES ('Staff', 'staff@test', 'x') RETURNING id")).rows[0].id;
    await rejects(db, "INSERT INTO users(name, email, password_hash, is_admin) VALUES ('Outro', 'outro@test', 'x', true)", [], '23505');
    await rejects(db, 'UPDATE users SET is_admin = true WHERE id = $1', [staff], '23505');
    await rejects(db, 'UPDATE users SET session_version = -1 WHERE id = $1', [staff], '23514');

    const category = (await db.query("INSERT INTO categories(title, short_title) VALUES ('Categoria', 'Categoria') RETURNING id")).rows[0].id;
    await rejects(db, 'INSERT INTO categories(title, short_title) VALUES ($1, $2)', ['C', 'x'.repeat(25)], '23514');
    await rejects(db, 'INSERT INTO categories(title) VALUES ($1)', ['C'], '23502');
    await db.query('INSERT INTO categories(title, short_title) VALUES ($1, $2)', ['C24', 'x'.repeat(24)]);
    await rejects(db, 'INSERT INTO categories(title, short_title) VALUES ($1, $2)', ['C', ' Garantias'], '23514');
    await rejects(db, 'INSERT INTO categories(title, short_title) VALUES ($1, $2)', ['C', 'Garantias '], '23514');

    const insertQuestion = 'INSERT INTO questions(category_id, question, answer, short_title, short_description, requires_in_person, out_of_scope, llm_allowed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id';
    const question = (await db.query(insertQuestion, [category, 'Q', 'A', 'Q', 'd'.repeat(72), true, false, true])).rows[0].id;
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'x'.repeat(25), null, false, false, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', ' Garantias', null, false, false, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Garantias ', null, false, false, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Q', ' x', false, false, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Q', 'x ', false, false, true], '23514');
    await db.query(insertQuestion, [category, 'Q', 'A', 'x'.repeat(24), null, false, false, true]);
    await rejects(db, insertQuestion, [category, 'Q', 'A', null, null, false, false, true], '23502');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Q', 'd'.repeat(73), false, false, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Q', '   ', false, false, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Q', null, true, true, false], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'A', 'Q', null, false, true, true], '23514');
    await rejects(db, insertQuestion, [category, 'Q', 'a'.repeat(3001), 'Q', null, false, false, true], '23514');
    await db.query(insertQuestion, [category, 'Q', 'a'.repeat(3000), 'Q', null, false, true, false]);
    await db.query("INSERT INTO questions(category_id, question, answer, short_title, seed_key) VALUES ($1, 'Q', 'A', 'Q', 'k1')", [category]);
    await rejects(db, "INSERT INTO questions(category_id, question, answer, short_title, seed_key) VALUES ($1, 'Q', 'A', 'Q', 'k1')", [category], '23505');
    await db.query("INSERT INTO requireddocuments(question_id, description, position) VALUES ($1, 'Doc', 0)", [question]);
    await rejects(db, "INSERT INTO requireddocuments(question_id, description, position) VALUES ($1, 'Doc', -1)", [question], '23514');

    const session = (await db.query("INSERT INTO sessions(phone_hash) VALUES ('s1') RETURNING id, outcome, list_page")).rows[0];
    assert.equal(session.outcome, 'IN_PROGRESS');
    assert.equal(session.list_page, 1);
    const draft = { by_representative: true, holder_name: 'Maria', cpf_hash: hex64, cpf_masked: '***.456.789-**', target_appointment_id: 1 };
    await db.query('UPDATE sessions SET draft = $1, current_step = $2, current_question_id = $3 WHERE id = $4', [draft, 'AWAITING_SLOT', question, session.id]);
    await rejects(db, 'UPDATE sessions SET draft = $1 WHERE id = $2', [{ cpf: '12345678909' }, session.id], '23514');
    await rejects(db, 'UPDATE sessions SET draft = $1 WHERE id = $2', [{ cpf_masked: '123.456.789-09' }, session.id], '23514');
    await rejects(db, 'UPDATE sessions SET draft = $1 WHERE id = $2', [{ cpf_hash: 'nothex' }, session.id], '23514');
    await rejects(db, "UPDATE sessions SET draft = '[]'::jsonb WHERE id = $1", [session.id], '23514');
    await rejects(db, 'UPDATE sessions SET list_page = 0 WHERE id = $1', [session.id], '23514');
    await rejects(db, "UPDATE sessions SET status = 'FINISHED', draft = NULL WHERE id = $1", [session.id], '23514');
    await rejects(db, "UPDATE sessions SET status = 'FINISHED', outcome = 'RESOLVED' WHERE id = $1", [session.id], '23514');
    await rejects(db, "UPDATE sessions SET status = 'ABANDONED', outcome = 'ABANDONED', abandoned_at_step = 'AWAITING_SLOT' WHERE id = $1", [session.id], '23514');
    await rejects(db, "UPDATE sessions SET status = 'ABANDONED', outcome = 'ABANDONED', draft = NULL WHERE id = $1", [session.id], '23514');
    await rejects(db, "UPDATE sessions SET status = 'FINISHED', outcome = 'ABANDONED', abandoned_at_step = 'AWAITING_SLOT', draft = NULL WHERE id = $1", [session.id], '23514');
    await rejects(db, "UPDATE sessions SET status = 'FINISHED', outcome = 'RESOLVED', abandoned_at_step = 'AWAITING_SLOT', draft = NULL WHERE id = $1", [session.id], '23514');
    const finished = (await db.query("INSERT INTO sessions(phone_hash, status, outcome, current_step) VALUES ('s2', 'FINISHED', 'SCHEDULED', 'FINISHED') RETURNING id")).rows[0].id;
    await db.query("INSERT INTO sessions(phone_hash, status, outcome, current_step, abandoned_at_step) VALUES ('s3', 'ABANDONED', 'ABANDONED', 'AWAITING_HOLDER_CPF', 'AWAITING_HOLDER_CPF')");
    await rejects(db, 'UPDATE sessions SET draft = $1 WHERE id = $2', [{ holder_name: 'Maria' }, finished], '23514');
    await rejects(db, "UPDATE sessions SET draft = $1 WHERE phone_hash = 's3'", [{ holder_name: 'Maria' }], '23514');
    await rejects(db, "INSERT INTO sessions(phone_hash, status) VALUES ('s4', 'FINISHED')", [], '23514');

    const insertAppointment = `INSERT INTO appointments(session_id, question_id, reason, name, cpf_hash, cpf_masked, phone_encrypted, documents_sent, appointment_datetime, status, assigned_user_id)
        VALUES ($1, $2, 'REQUIRES_IN_PERSON', 'Maria', $3, $4, $5, $6, $7, $8, $9) RETURNING id, status`;
    const docs = { group: ['RG'], question: ['Fatura'] };
    const at = '2030-01-01T12:00:00Z';
    const appointmentArgs = (overrides = {}) => {
        const v = { cpfHash: hex64, cpfMasked: '***.456.789-**', phone: encrypted, docs, at, status: 'PENDING', assigned: null, ...overrides };
        return [session.id, question, v.cpfHash, v.cpfMasked, v.phone, v.docs, v.at, v.status, v.assigned];
    };
    const appointment = (await db.query(insertAppointment, appointmentArgs())).rows[0];
    assert.equal(appointment.status, 'PENDING');
    await rejects(db, insertAppointment, appointmentArgs(), '23505');
    await rejects(db, insertAppointment, appointmentArgs({ status: 'CONFIRMED', assigned: staff }), '23505');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', assigned: staff }), '23514');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', status: 'CONFIRMED' }), '23514');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', status: 'ATTENDED' }), '23514');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', cpfMasked: '123.456.789-09' }), '23514');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', cpfHash: '12345678909' }), '23514');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', phone: '5512999990000' }), '23514');
    await rejects(db, insertAppointment, appointmentArgs({ at: '2030-01-02T12:00:00Z', docs: { group: ['RG'] } }), '23514');
    await db.query(insertAppointment, appointmentArgs({ cpfHash: otherHex64, status: 'CONFIRMED', assigned: admin }));
    await db.query(insertAppointment, appointmentArgs({ status: 'CANCELED' }));
    await db.query(insertAppointment, appointmentArgs({ at: '2030-01-03T12:00:00Z', phone: null }));

    await db.query("INSERT INTO appointmentevents(appointment_id, type, actor_user_id, data) VALUES ($1, 'CLAIMED', $2, $3)", [appointment.id, staff, {}]);
    await rejects(db, "INSERT INTO appointmentevents(appointment_id, type, data) VALUES ($1, 'CREATED', '[]'::jsonb)", [appointment.id], '23514');
    const note = (await db.query("INSERT INTO appointmentnotes(appointment_id, author_user_id, text) VALUES ($1, $2, 'Trouxe a fatura') RETURNING id", [appointment.id, staff])).rows[0].id;
    await rejects(db, "INSERT INTO appointmentnotes(appointment_id, author_user_id, text) VALUES ($1, $2, '  ')", [appointment.id, staff], '23514');
    await rejects(db, "UPDATE appointmentnotes SET text = 'Outro' WHERE id = $1", [note], 'P0001');
    await rejects(db, 'DELETE FROM appointmentnotes WHERE id = $1', [note], 'P0001');

    await db.query("INSERT INTO conversationevents(session_id, type, category_id, question_id, appointment_id, data) VALUES ($1, 'ANSWER_SENT', $2, $3, $4, $5)", [session.id, category, question, appointment.id, { llm: 'USED' }]);
    await rejects(db, "INSERT INTO conversationevents(session_id, type, data) VALUES ($1, 'STARTED', '\"texto\"'::jsonb)", [session.id], '23514');
    await rejects(db, 'DELETE FROM questions WHERE id = $1', [question], '23503');
    const tempSession = (await db.query("INSERT INTO sessions(phone_hash) VALUES ('cascade') RETURNING id")).rows[0].id;
    await db.query("INSERT INTO conversationevents(session_id, type) VALUES ($1, 'STARTED')", [tempSession]);
    await db.query('DELETE FROM sessions WHERE id = $1', [tempSession]);
    assert.equal(await count(db, 'SELECT 1 FROM conversationevents WHERE session_id = $1', [tempSession]), 0);

    const insertSettings = "INSERT INTO schedulesettings(slot_minutes, seats_per_slot, window_days, min_notice_days, wait_alert_days, unit_address) VALUES ($1, 2, 30, 1, 7, 'Rua Teste, 1')";
    await rejects(db, insertSettings, [25], '23514');
    await db.query(insertSettings, [30]);
    await rejects(db, insertSettings, [30], '23505');
    await rejects(db, "INSERT INTO schedulesettings(id, slot_minutes, seats_per_slot, window_days, min_notice_days, wait_alert_days, unit_address) VALUES (2, 30, 2, 30, 1, 7, 'Rua')", [], '23514');
    await rejects(db, 'UPDATE schedulesettings SET reminder_hours = 3', [], '23514');

    const insertRange = 'INSERT INTO scheduleranges(weekday, slot_index, start_time, end_time) VALUES (1, $1, $2, $3)';
    await db.query(insertRange, [1, '08:00', '10:00']);
    await db.query(insertRange, [2, '10:00', '12:00']);
    await db.query(insertRange, [3, '13:00', '17:00']);
    await rejects(db, insertRange, [4, '17:00', '18:00'], '23514');
    await rejects(db, insertRange, [3, '17:00', '18:00'], '23505');
    await rejects(db, 'INSERT INTO scheduleranges(weekday, slot_index, start_time, end_time) VALUES (2, 1, $1, $2)', ['10:00', '09:00'], '23514');
    await rejects(db, "INSERT INTO scheduleranges(weekday, slot_index, start_time, end_time) VALUES (7, 1, '08:00', '09:00')", [], '23514');

    await db.query("INSERT INTO blockeddates(date, description) VALUES ('2030-12-25', 'Natal')");
    await db.query("INSERT INTO blockeddates(date, start_time, end_time, description) VALUES ('2030-12-24', '12:00', '18:00', 'Véspera')");
    await rejects(db, "INSERT INTO blockeddates(date, start_time, description) VALUES ('2030-12-24', '12:00', 'Meio')", [], '23514');
    await rejects(db, "INSERT INTO blockeddates(date, end_time, description) VALUES ('2030-12-24', '12:00', 'Meio')", [], '23514');

    await db.query("INSERT INTO attendancedocuments(attendee_group, description, position) VALUES ('HOLDER', 'RG', 0), ('REPRESENTATIVE', 'Procuração', 0)");
    await rejects(db, "INSERT INTO attendancedocuments(attendee_group, description) VALUES ('HOLDER', ' ')", [], '23514');

    const insertWhatsApp = 'INSERT INTO whatsappsettings(verify_token, access_token_encrypted, app_secret_encrypted) VALUES ($1, $2, $3)';
    await rejects(db, insertWhatsApp, ['verify', 'EAAGm0PX4ZCpsBAxyz', null], '23514');
    await rejects(db, insertWhatsApp, ['verify', null, 'plainsecret'], '23514');
    await db.query(insertWhatsApp, ['verify', encrypted, encrypted]);
    await rejects(db, insertWhatsApp, ['verify', null, null], '23505');
    await rejects(db, "INSERT INTO whatsappsettings(id, verify_token) VALUES (2, 'verify')", [], '23514');
}

async function checkRollback(db, url) {
    mustMigrate(url, 'down', '1');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 11);
    const category = (await db.query("INSERT INTO categories(title, short_title) VALUES ('Old check', ' Garantias') RETURNING id")).rows[0].id;
    await db.query("INSERT INTO questions(category_id, question, answer, short_title, short_description) VALUES ($1, 'Q', 'A', 'Garantias ', ' x')", [category]);
    await rejects(db, 'INSERT INTO categories(title, short_title) VALUES ($1, $2)', ['C', 'x'.repeat(25)], '23514');
    mustMigrate(url, 'down', '1');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 10);
    assert.deepEqual(await tableNames(db), [
        'appointments', 'categories', 'interactions', 'pgmigrations', 'questions', 'requireddocuments', 'sessions', 'users',
    ]);
    assert.deepEqual(await enumValues(db, 'appointment_status'), ['SCHEDULED', 'CANCELED', 'ATTENDED']);
    assert.deepEqual(await enumValues(db, 'session_step'), ['AWAITING_CATEGORY', 'AWAITING_QUESTION', 'FINISHED']);
    assert.equal(await count(db, "SELECT 1 FROM pg_type WHERE typname IN ('session_outcome', 'appointment_reason', 'attendee_group', 'conversation_event_type', 'appointment_event_type')"), 0);
    assert.equal(await column(db, 'users', 'session_version'), undefined);
    assert.equal(await column(db, 'categories', 'short_title'), undefined);
    assert.equal(await count(db, "SELECT 1 FROM sessions WHERE phone_hash = 's1' AND status = 'IN_PROGRESS' AND current_step = 'AWAITING_CATEGORY'"), 1);
    assert.equal(await count(db, "SELECT 1 FROM sessions WHERE phone_hash = 's3' AND current_step = 'FINISHED'"), 1);
    assert.equal(await count(db, "SELECT 1 FROM pg_extension WHERE extname = 'unaccent'"), 0);
    mustMigrate(url, 'up');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
    assert.deepEqual(await tableNames(db), expectedTables);
    mustMigrate(url, 'down', '12');
    assert.deepEqual(await tableNames(db), ['pgmigrations']);
    assert.equal(await count(db, "SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'"), 0);
    mustMigrate(url, 'up');
    await checkFreshSchema(db);
}

async function snapshotContent(db) {
    return {
        categories: (await db.query('SELECT id, title, description FROM categories ORDER BY id')).rows,
        questions: (await db.query('SELECT id, category_id, question, legal_basis, answer, requires_in_person, out_of_scope FROM questions ORDER BY id')).rows,
        documents: (await db.query('SELECT id, question_id, description FROM requireddocuments ORDER BY id')).rows,
    };
}

async function checkUpgradeWithSeed(db, url) {
    mustMigrate(url, 'up', '10');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 10);
    await seedVersion10(db);
    const before = await snapshotContent(db);
    assert.equal(before.categories.length, 7);
    assert.equal(before.questions.length, 47);
    assert.ok(before.documents.length > 0);
    assert.equal(before.questions.filter(q => q.out_of_scope).length, 1);

    const category = before.categories[0].id;
    await db.query("INSERT INTO sessions(phone_hash, current_step, current_category_id, started_at) VALUES ('in-progress', 'AWAITING_QUESTION', $1, '2030-01-01T10:00:00Z')", [category]);
    await db.query("INSERT INTO sessions(phone_hash, status, current_step, started_at, ended_at) VALUES ('finished', 'FINISHED', 'FINISHED', '2030-01-01T10:00:00Z', '2030-01-01T10:05:00Z')");
    await db.query("INSERT INTO sessions(phone_hash, status, current_step, current_category_id, started_at, ended_at) VALUES ('abandoned', 'ABANDONED', 'AWAITING_QUESTION', $1, '2030-01-01T10:00:00Z', '2030-01-01T10:40:00Z')", [category]);

    mustMigrate(url, 'up');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
    assert.deepEqual(await snapshotContent(db), before);

    const outOfScope = before.questions.find(q => q.out_of_scope).id;
    assert.deepEqual((await db.query('SELECT id FROM questions WHERE NOT llm_allowed')).rows.map(r => r.id), [outOfScope]);
    assert.equal(await count(db, "SELECT 1 FROM categories WHERE short_title IS NULL OR short_title <> btrim(left(title, 24)) OR char_length(short_title) > 24"), 0);
    assert.equal(await count(db, "SELECT 1 FROM questions WHERE short_title IS NULL OR short_title <> btrim(left(question, 24)) OR char_length(short_title) > 24"), 0);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE short_description IS NOT NULL'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM (SELECT position, row_number() OVER (ORDER BY id) - 1 AS rn FROM categories) p WHERE position <> rn'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM (SELECT position, row_number() OVER (PARTITION BY category_id ORDER BY id) - 1 AS rn FROM questions) p WHERE position <> rn'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM (SELECT position, row_number() OVER (PARTITION BY question_id ORDER BY id) - 1 AS rn FROM requireddocuments) p WHERE position <> rn'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE position > 0'), 47 - 7);

    const sessions = (await db.query(
        'SELECT phone_hash, status, outcome, current_step, abandoned_at_step, current_category_id, last_interaction_at = COALESCE(ended_at, started_at) AS backfilled, draft, list_page FROM sessions ORDER BY id',
    )).rows;
    assert.deepEqual(sessions, [
        { phone_hash: 'in-progress', status: 'IN_PROGRESS', outcome: 'IN_PROGRESS', current_step: 'AWAITING_QUESTION', abandoned_at_step: null, current_category_id: category, backfilled: true, draft: null, list_page: 1 },
        { phone_hash: 'finished', status: 'FINISHED', outcome: 'RESOLVED', current_step: 'FINISHED', abandoned_at_step: null, current_category_id: null, backfilled: true, draft: null, list_page: 1 },
        { phone_hash: 'abandoned', status: 'ABANDONED', outcome: 'ABANDONED', current_step: 'AWAITING_QUESTION', abandoned_at_step: 'AWAITING_QUESTION', current_category_id: category, backfilled: true, draft: null, list_page: 1 },
    ]);

    mustSeed(url);
    assert.equal(await count(db, 'SELECT 1 FROM categories'), 7);
    assert.equal(await count(db, 'SELECT 1 FROM questions'), 47);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE out_of_scope AND llm_allowed'), 0);
    mustSeed(url);
    assert.equal(await count(db, 'SELECT 1 FROM categories'), 7);
    assert.equal(await count(db, 'SELECT 1 FROM questions'), 47);
}

async function checkNonEmptyAppointmentsGuard(db, url) {
    mustMigrate(url, 'up', '10');
    await db.query("INSERT INTO appointments(cpf_hash, name, appointment_reason, professional, appointment_datetime) VALUES ('hash', 'Teste', 'Teste', 'LAWYER', '2030-01-01T12:00:00Z')");
    const result = migrate(url, 'up');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /recria a tabela Appointments, mas ela tem linhas/);
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 10);
    assert.equal(await column(db, 'users', 'is_admin'), undefined);
    assert.ok((await tableNames(db)).includes('interactions'));
    assert.deepEqual(await enumValues(db, 'session_step'), ['AWAITING_CATEGORY', 'AWAITING_QUESTION', 'FINISHED']);
    await db.query('DELETE FROM appointments');
    mustMigrate(url, 'up');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
}

async function checkShortTextNormalization(db, url) {
    mustMigrate(url, 'up', '11');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 11);
    const category = (await db.query("INSERT INTO categories(title, short_title) VALUES ('Abc', 'Abc ') RETURNING id")).rows[0].id;
    const question = (await db.query("INSERT INTO questions(category_id, question, answer, short_title, short_description) VALUES ($1, 'Q', 'A', ' Pergunta ', ' Descrição ') RETURNING id", [category])).rows[0].id;
    mustMigrate(url, 'up');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
    assert.equal((await db.query('SELECT short_title FROM categories WHERE id = $1', [category])).rows[0].short_title, 'Abc');
    assert.deepEqual((await db.query('SELECT short_title, short_description FROM questions WHERE id = $1', [question])).rows[0], { short_title: 'Pergunta', short_description: 'Descrição' });
    mustMigrate(url, 'down', '1');
    mustMigrate(url, 'up');
    assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
}

async function rowsAsJson(db, table) {
    return (await db.query(`SELECT row_to_json(t)::text AS r FROM ${table} t ORDER BY id`)).rows.map(r => r.r);
}

const seededTables = [
    'categories', 'questions', 'requireddocuments', 'schedulesettings', 'scheduleranges', 'blockeddates', 'attendancedocuments',
];

async function snapshotSeededTables(db) {
    const snapshot = {};
    for (const table of seededTables) {
        snapshot[table] = await rowsAsJson(db, table);
    }
    return snapshot;
}

async function assertSeededContent(db) {
    const { faq } = seedData();
    assert.equal(await count(db, 'SELECT 1 FROM categories'), 7);
    assert.equal(await count(db, 'SELECT 1 FROM questions'), 47);
    assert.equal(await count(db, 'SELECT 1 FROM categories WHERE seed_key IS NULL'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE seed_key IS NULL'), 0);
    for (const [categoryPosition, category] of faq.entries()) {
        const row = (await db.query('SELECT id, title, short_title, description, position FROM categories WHERE seed_key = $1', [category.seedKey])).rows[0];
        assert.ok(row, category.seedKey);
        assert.deepEqual(
            { title: row.title, short_title: row.short_title, description: row.description, position: row.position },
            { title: category.title, short_title: category.shortTitle, description: category.description, position: categoryPosition },
            category.seedKey,
        );
        for (const [questionPosition, question] of category.questions.entries()) {
            const q = (await db.query(
                'SELECT id, category_id, question, short_title, short_description, position, llm_allowed, out_of_scope FROM questions WHERE seed_key = $1',
                [question.seedKey],
            )).rows[0];
            assert.ok(q, question.seedKey);
            assert.deepEqual(
                { category_id: q.category_id, question: q.question, short_title: q.short_title, short_description: q.short_description, position: q.position, llm_allowed: q.llm_allowed },
                { category_id: row.id, question: question.question, short_title: question.shortTitle, short_description: question.shortDescription ?? null, position: questionPosition, llm_allowed: !(question.outOfScope ?? false) },
                question.seedKey,
            );
            const documents = (await db.query('SELECT description, position FROM requireddocuments WHERE question_id = $1 ORDER BY position, id', [q.id])).rows;
            assert.deepEqual(documents, question.requiredDocuments.map((description, position) => ({ description, position })), question.seedKey);
        }
    }
    assert.deepEqual((await db.query('SELECT seed_key FROM questions WHERE NOT llm_allowed')).rows, [{ seed_key: 'outros.direito-imobiliario' }]);
    assert.equal(await count(db, 'SELECT 1 FROM categories WHERE char_length(short_title) > 24 OR short_title <> btrim(short_title)'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE char_length(short_title) > 24 OR short_title <> btrim(short_title) OR char_length(short_description) > 72 OR short_description <> btrim(short_description)'), 0);
}

async function assertInitialConfig(db) {
    const { config } = seedData();
    const settings = (await db.query('SELECT slot_minutes, seats_per_slot, window_days, min_notice_days, wait_alert_days, unit_address, unit_address_complement, reminder_enabled, reminder_hours, updated_by FROM schedulesettings')).rows;
    assert.deepEqual(settings, [{
        slot_minutes: config.slotMinutes, seats_per_slot: config.seatsPerSlot, window_days: config.windowDays,
        min_notice_days: config.minNoticeDays, wait_alert_days: config.waitAlertDays, unit_address: config.unitAddress,
        unit_address_complement: config.unitAddressComplement, reminder_enabled: false, reminder_hours: config.reminderHours, updated_by: null,
    }]);
    assert.equal(settings[0].unit_address, 'Avenida Capitão Joaquim Pinheiro do Prado, 222 - Centro, Jacareí - SP, CEP 12327-160');
    const ranges = (await db.query("SELECT weekday, slot_index, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time FROM scheduleranges ORDER BY weekday, slot_index")).rows;
    assert.equal(ranges.length, 10);
    assert.deepEqual(ranges, config.scheduleRanges.map(r => ({ weekday: r.weekday, slot_index: r.slotIndex, start_time: r.startTime, end_time: r.endTime })));
    assert.equal(await count(db, 'SELECT 1 FROM blockeddates'), 0);
    const documents = async group => (await db.query('SELECT description, position FROM attendancedocuments WHERE attendee_group = $1 ORDER BY position, id', [group])).rows;
    assert.deepEqual(await documents('HOLDER'), config.attendanceDocuments.holder.map((description, position) => ({ description, position })));
    assert.deepEqual(await documents('REPRESENTATIVE'), config.attendanceDocuments.representative.map((description, position) => ({ description, position })));
    assert.equal((await documents('HOLDER')).length, 4);
    assert.equal((await documents('REPRESENTATIVE')).length, 4);
}

async function checkSeedFromScratch(db, url) {
    mustMigrate(url, 'up');
    const output = mustSeed(url);
    assert.match(output, /Categorias: 7 inseridas, 0 atualizadas, 0 mantidas/);
    assert.match(output, /Perguntas: 47 inseridas, 0 atualizadas, 0 mantidas/);
    assert.match(output, /configuração inicial criada/);
    await assertSeededContent(db);
    await assertInitialConfig(db);
}

async function checkSeedIdempotence(db, url) {
    mustMigrate(url, 'up');
    mustSeed(url);
    const before = await snapshotSeededTables(db);
    const output = mustSeed(url);
    assert.match(output, /Categorias: 0 inseridas, 0 atualizadas, 7 mantidas/);
    assert.match(output, /Perguntas: 0 inseridas, 0 atualizadas, 47 mantidas/);
    assert.match(output, /configuração inicial já existe, mantida/);
    assert.deepEqual(await snapshotSeededTables(db), before);
}

async function checkSeedBackfillWithHistory(db, url) {
    mustMigrate(url, 'up', '10');
    await seedVersion10(db);
    mustMigrate(url, 'up');
    assert.equal(await count(db, 'SELECT 1 FROM categories WHERE seed_key IS NOT NULL'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE seed_key IS NOT NULL'), 0);
    assert.equal(await count(db, 'SELECT 1 FROM questions WHERE short_title <> btrim(left(question, 24))'), 0);
    const categoryIds = Object.fromEntries((await db.query('SELECT title, id FROM categories')).rows.map(r => [r.title, r.id]));
    const questionIds = Object.fromEntries((await db.query('SELECT question, id FROM questions')).rows.map(r => [r.question, r.id]));

    const { faq } = seedData();
    const garantias = faq.find(c => c.seedKey === 'garantias');
    const category = categoryIds[garantias.title];
    const question = questionIds[garantias.questions[0].question];
    const draft = { by_representative: false, holder_name: 'Maria', cpf_masked: '***.456.789-**' };
    const inProgress = (await db.query(
        "INSERT INTO sessions(phone_hash, current_step, current_category_id, current_question_id, list_page, draft) VALUES ('backfill-in-progress', 'AWAITING_HOLDER_NAME', $1, $2, 2, $3) RETURNING id",
        [category, question, draft],
    )).rows[0].id;
    await db.query("INSERT INTO sessions(phone_hash, status, outcome, current_step, current_category_id, current_question_id) VALUES ('backfill-finished', 'FINISHED', 'RESOLVED', 'FINISHED', $1, $2)", [category, question]);
    await db.query("INSERT INTO sessions(phone_hash, status, outcome, current_step, abandoned_at_step, current_category_id, list_page) VALUES ('backfill-abandoned', 'ABANDONED', 'ABANDONED', 'AWAITING_QUESTION', 'AWAITING_QUESTION', $1, 2)", [category]);
    await db.query("INSERT INTO conversationevents(session_id, type, category_id, question_id) VALUES ($1, 'QUESTION_CHOSEN', $2, $3)", [inProgress, category, question]);
    const sessionsBefore = await rowsAsJson(db, 'sessions');
    const eventsBefore = await rowsAsJson(db, 'conversationevents');

    const output = mustSeed(url);
    assert.match(output, /Categorias: 0 inseridas, 7 atualizadas, 0 mantidas/);
    assert.match(output, /Perguntas: 0 inseridas, 47 atualizadas, 0 mantidas/);
    assert.deepEqual(Object.fromEntries((await db.query('SELECT title, id FROM categories')).rows.map(r => [r.title, r.id])), categoryIds);
    assert.deepEqual(Object.fromEntries((await db.query('SELECT question, id FROM questions')).rows.map(r => [r.question, r.id])), questionIds);
    await assertSeededContent(db);
    assert.deepEqual(await rowsAsJson(db, 'sessions'), sessionsBefore);
    assert.deepEqual(await rowsAsJson(db, 'conversationevents'), eventsBefore);

    const snapshot = await snapshotSeededTables(db);
    mustSeed(url);
    assert.deepEqual(await snapshotSeededTables(db), snapshot);
}

async function checkSeedKeepsPanelEdits(db, url) {
    mustMigrate(url, 'up');
    mustSeed(url);
    const user = (await db.query("INSERT INTO users(name, email, password_hash) VALUES ('Equipe', 'equipe@test', 'x') RETURNING id")).rows[0].id;
    const question = (await db.query("UPDATE questions SET updated_by = $1, short_title = 'Editado no painel', updated_at = '2030-01-01T10:00:00Z' WHERE seed_key = 'contrato.fidelidade' RETURNING id", [user])).rows[0].id;
    await db.query('DELETE FROM requireddocuments WHERE question_id = $1', [question]);
    await db.query("INSERT INTO requireddocuments(question_id, description, position) VALUES ($1, 'Documento do painel', 0)", [question]);
    const panelCategory = (await db.query("INSERT INTO categories(title, short_title, position) VALUES ('Categoria do painel', 'Do painel', 7) RETURNING id")).rows[0].id;
    const editedCategory = (await db.query("UPDATE categories SET updated_by = $1, short_title = 'Garantias editada' WHERE seed_key = 'garantias' RETURNING id", [user])).rows[0].id;
    const snapshot = async () => ({
        question: (await db.query('SELECT row_to_json(q)::text AS r FROM questions q WHERE id = $1', [question])).rows,
        documents: (await db.query('SELECT row_to_json(d)::text AS r FROM requireddocuments d WHERE question_id = $1 ORDER BY id', [question])).rows,
        categories: (await db.query('SELECT row_to_json(c)::text AS r FROM categories c WHERE id = ANY($1::bigint[]) ORDER BY id', [[panelCategory, editedCategory]])).rows,
    });
    const before = await snapshot();
    const output = mustSeed(url);
    assert.match(output, /Categorias: 0 inseridas, 0 atualizadas, 7 mantidas/);
    assert.deepEqual(await snapshot(), before);
    assert.equal(await count(db, 'SELECT 1 FROM categories'), 8);
    assert.equal(await count(db, 'SELECT 1 FROM questions'), 47);
}

async function checkSeedKeepsConfig(db, url) {
    mustMigrate(url, 'up');
    mustSeed(url);
    await db.query("UPDATE schedulesettings SET seats_per_slot = 5, unit_address = 'Rua Alterada, 10' WHERE id = 1");
    await db.query('DELETE FROM scheduleranges WHERE weekday = 5 AND slot_index = 2');
    await db.query("DELETE FROM attendancedocuments WHERE attendee_group = 'REPRESENTATIVE'");
    const before = await snapshotSeededTables(db);
    const output = mustSeed(url);
    assert.match(output, /configuração inicial já existe, mantida/);
    assert.deepEqual(await snapshotSeededTables(db), before);
    assert.deepEqual((await db.query('SELECT seats_per_slot, unit_address FROM schedulesettings')).rows, [{ seats_per_slot: 5, unit_address: 'Rua Alterada, 10' }]);
    assert.equal(await count(db, 'SELECT 1 FROM scheduleranges'), 9);
    assert.equal(await count(db, "SELECT 1 FROM attendancedocuments WHERE attendee_group = 'REPRESENTATIVE'"), 0);
}

async function main() {
    assert.ok(process.env.DB_TEST_URL, 'Set DB_TEST_URL to a PostgreSQL connection with CREATEDB permission');
    checkMigrationFile();
    const admin = new Client({ connectionString: process.env.DB_TEST_URL });
    await admin.connect();
    try {
        await withDatabase(admin, process.env.DB_TEST_URL, async (db, url) => {
            mustMigrate(url, 'up');
            await checkFreshSchema(db);
            mustMigrate(url, 'up');
            assert.equal(await count(db, 'SELECT 1 FROM pgmigrations'), 12);
            await checkConstraints(db);
            await checkRollback(db, url);
        });
        console.log('OK: fresh schema, enums, constraints, trigger, rollback and reapply');
        await withDatabase(admin, process.env.DB_TEST_URL, checkUpgradeWithSeed);
        console.log('OK: upgrade from version 10 with seed and sessions, seed rerun');
        await withDatabase(admin, process.env.DB_TEST_URL, checkNonEmptyAppointmentsGuard);
        console.log('OK: guard aborts on non-empty Appointments without applying anything');
        await withDatabase(admin, process.env.DB_TEST_URL, checkShortTextNormalization);
        console.log('OK: migration 12 trims short texts saved under version 11, rollback and reapply');
        await withDatabase(admin, process.env.DB_TEST_URL, checkSeedFromScratch);
        console.log('OK: seed from scratch loads content, titles, order and initial config');
        await withDatabase(admin, process.env.DB_TEST_URL, checkSeedIdempotence);
        console.log('OK: second seed run changes nothing');
        await withDatabase(admin, process.env.DB_TEST_URL, checkSeedBackfillWithHistory);
        console.log('OK: seed backfills seed_key keeping ids, events and sessions');
        await withDatabase(admin, process.env.DB_TEST_URL, checkSeedKeepsPanelEdits);
        console.log('OK: seed keeps rows edited or created by the panel');
        await withDatabase(admin, process.env.DB_TEST_URL, checkSeedKeepsConfig);
        console.log('OK: seed never overwrites the initial config');
    } finally {
        await admin.end();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
