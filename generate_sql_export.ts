#!/usr/bin/env bun
/**
 * Generate complete SQL export from poehali.dev database
 * This script connects to the source database and generates READY_TO_IMPORT.sql
 */

import { Client } from 'pg';
import { writeFileSync } from 'fs';

// Source database connection (poehali.dev)
const SOURCE_DB_CONFIG = {
  database: 't_p53416936_auxchat_energy_messa',
  user: 'p53416936_auxchat_energy_messa',
  password: 'gFj!27Np',
  host: 'poehali.dev',
  port: 5432
};

function escapeSqlString(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  // Escape single quotes by doubling them
  const stringValue = String(value).replace(/'/g, "''");
  return `'${stringValue}'`;
}

function generateInsertStatement(tableName: string, columns: string[], row: any): string {
  const values = columns.map(col => escapeSqlString(row[col]));
  const colsStr = columns.join(', ');
  const valsStr = values.join(', ');
  return `INSERT INTO ${tableName} (${colsStr}) VALUES (${valsStr});`;
}

async function exportTable(client: Client, tableName: string): Promise<{ rows: any[], columns: string[] }> {
  const query = `SELECT * FROM ${tableName} ORDER BY id`;
  const result = await client.query(query);
  const columns = result.fields.map(f => f.name);
  return { rows: result.rows, columns };
}

async function main() {
  console.log('Connecting to poehali.dev database...');
  
  const client = new Client(SOURCE_DB_CONFIG);
  await client.connect();
  
  console.log('Connected successfully!\n');
  
  const sqlLines: string[] = [];
  
  // Header
  sqlLines.push('-- =====================================================');
  sqlLines.push('-- COMPLETE DATABASE EXPORT FROM poehali.dev');
  sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
  sqlLines.push('-- Target: Timeweb PostgreSQL Database');
  sqlLines.push('-- =====================================================\n');
  
  sqlLines.push('-- Set client encoding');
  sqlLines.push('SET client_encoding = \'UTF8\';');
  sqlLines.push('SET standard_conforming_strings = on;\n');
  
  // DROP tables
  sqlLines.push('-- =====================================================');
  sqlLines.push('-- DROP EXISTING TABLES');
  sqlLines.push('-- =====================================================\n');
  
  sqlLines.push('DROP TABLE IF EXISTS message_reactions CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS reactions CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS blacklist CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS sms_codes CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS subscriptions CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS user_photos CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS private_messages CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS messages CASCADE;');
  sqlLines.push('DROP TABLE IF EXISTS users CASCADE;\n');
  
  // CREATE tables
  sqlLines.push('-- =====================================================');
  sqlLines.push('-- CREATE TABLES');
  sqlLines.push('-- =====================================================\n');
  
  sqlLines.push(`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar TEXT,
    energy INTEGER DEFAULT 100,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password VARCHAR(255),
    bio TEXT,
    status VARCHAR(50) DEFAULT 'online',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);\n`);

  sqlLines.push(`CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);\n`);

  sqlLines.push(`CREATE TABLE message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);\n`);

  sqlLines.push(`CREATE TABLE private_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voice_url TEXT,
    voice_duration INTEGER
);\n`);

  sqlLines.push(`CREATE TABLE user_photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    photo_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    display_order INTEGER DEFAULT 0
);\n`);

  sqlLines.push(`CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    subscriber_id INTEGER NOT NULL,
    subscribed_to_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subscriber_id, subscribed_to_id),
    CHECK (subscriber_id != subscribed_to_id)
);\n`);

  sqlLines.push(`CREATE TABLE sms_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE
);\n`);

  sqlLines.push(`CREATE TABLE blacklist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    blocked_user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, blocked_user_id)
);\n`);

  sqlLines.push(`CREATE TABLE reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id),
    user_id INTEGER REFERENCES users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);\n`);

  // CREATE indexes
  sqlLines.push('-- =====================================================');
  sqlLines.push('-- CREATE INDEXES');
  sqlLines.push('-- =====================================================\n');
  
  sqlLines.push('CREATE INDEX idx_messages_created_at ON messages(created_at DESC);');
  sqlLines.push('CREATE INDEX idx_messages_user_id ON messages(user_id);');
  sqlLines.push('CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);');
  sqlLines.push('CREATE INDEX idx_private_messages_receiver ON private_messages(receiver_id);');
  sqlLines.push('CREATE INDEX idx_private_messages_conversation ON private_messages(sender_id, receiver_id);');
  sqlLines.push('CREATE INDEX idx_user_photos_user_id ON user_photos(user_id);');
  sqlLines.push('CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);');
  sqlLines.push('CREATE INDEX idx_subscriptions_subscribed_to ON subscriptions(subscribed_to_id);');
  sqlLines.push('CREATE INDEX idx_sms_codes_phone ON sms_codes(phone);');
  sqlLines.push('CREATE INDEX idx_sms_codes_expires_at ON sms_codes(expires_at);');
  sqlLines.push('CREATE INDEX idx_blacklist_user_id ON blacklist(user_id);');
  sqlLines.push('CREATE INDEX idx_blacklist_blocked_user_id ON blacklist(blocked_user_id);');
  sqlLines.push('CREATE INDEX idx_reactions_message_id ON reactions(message_id);');
  sqlLines.push('CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);');
  sqlLines.push('CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);\n');

  // Export data
  sqlLines.push('-- =====================================================');
  sqlLines.push('-- INSERT DATA');
  sqlLines.push('-- =====================================================\n');
  
  let totalInserts = 0;
  
  // Export users
  console.log('Exporting users table...');
  const users = await exportTable(client, 'users');
  sqlLines.push(`-- Users table (${users.rows.length} rows)`);
  for (const row of users.rows) {
    sqlLines.push(generateInsertStatement('users', users.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${users.rows.length} users`);
  
  // Export messages
  console.log('Exporting messages table...');
  const messages = await exportTable(client, 'messages');
  sqlLines.push(`\n-- Messages table (${messages.rows.length} rows)`);
  for (const row of messages.rows) {
    sqlLines.push(generateInsertStatement('messages', messages.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${messages.rows.length} messages`);
  
  // Export private_messages
  console.log('Exporting private_messages table...');
  const privateMessages = await exportTable(client, 'private_messages');
  sqlLines.push(`\n-- Private messages table (${privateMessages.rows.length} rows)`);
  for (const row of privateMessages.rows) {
    sqlLines.push(generateInsertStatement('private_messages', privateMessages.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${privateMessages.rows.length} private messages`);
  
  // Export user_photos
  console.log('Exporting user_photos table...');
  const userPhotos = await exportTable(client, 'user_photos');
  sqlLines.push(`\n-- User photos table (${userPhotos.rows.length} rows)`);
  for (const row of userPhotos.rows) {
    sqlLines.push(generateInsertStatement('user_photos', userPhotos.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${userPhotos.rows.length} user photos`);
  
  // Export subscriptions
  console.log('Exporting subscriptions table...');
  const subscriptions = await exportTable(client, 'subscriptions');
  sqlLines.push(`\n-- Subscriptions table (${subscriptions.rows.length} rows)`);
  for (const row of subscriptions.rows) {
    sqlLines.push(generateInsertStatement('subscriptions', subscriptions.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${subscriptions.rows.length} subscriptions`);
  
  // Export sms_codes
  console.log('Exporting sms_codes table...');
  const smsCodes = await exportTable(client, 'sms_codes');
  sqlLines.push(`\n-- SMS codes table (${smsCodes.rows.length} rows)`);
  for (const row of smsCodes.rows) {
    sqlLines.push(generateInsertStatement('sms_codes', smsCodes.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${smsCodes.rows.length} SMS codes`);
  
  // Export blacklist
  console.log('Exporting blacklist table...');
  const blacklist = await exportTable(client, 'blacklist');
  sqlLines.push(`\n-- Blacklist table (${blacklist.rows.length} rows)`);
  for (const row of blacklist.rows) {
    sqlLines.push(generateInsertStatement('blacklist', blacklist.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${blacklist.rows.length} blacklist entries`);
  
  // Export reactions
  console.log('Exporting reactions table...');
  const reactions = await exportTable(client, 'reactions');
  sqlLines.push(`\n-- Reactions table (${reactions.rows.length} rows)`);
  for (const row of reactions.rows) {
    sqlLines.push(generateInsertStatement('reactions', reactions.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${reactions.rows.length} reactions`);
  
  // Export message_reactions
  console.log('Exporting message_reactions table...');
  const messageReactions = await exportTable(client, 'message_reactions');
  sqlLines.push(`\n-- Message reactions table (${messageReactions.rows.length} rows)`);
  for (const row of messageReactions.rows) {
    sqlLines.push(generateInsertStatement('message_reactions', messageReactions.columns, row));
    totalInserts++;
  }
  console.log(`Exported ${messageReactions.rows.length} message reactions`);
  
  // Update sequences
  sqlLines.push('\n-- =====================================================');
  sqlLines.push('-- UPDATE SEQUENCES');
  sqlLines.push('-- =====================================================\n');
  
  if (users.rows.length > 0) {
    const maxUserId = Math.max(...users.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('users_id_seq', ${maxUserId}, true);`);
  }
  
  if (messages.rows.length > 0) {
    const maxMessageId = Math.max(...messages.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('messages_id_seq', ${maxMessageId}, true);`);
  }
  
  if (privateMessages.rows.length > 0) {
    const maxPrivateMessageId = Math.max(...privateMessages.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('private_messages_id_seq', ${maxPrivateMessageId}, true);`);
  }
  
  if (userPhotos.rows.length > 0) {
    const maxUserPhotoId = Math.max(...userPhotos.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('user_photos_id_seq', ${maxUserPhotoId}, true);`);
  }
  
  if (subscriptions.rows.length > 0) {
    const maxSubscriptionId = Math.max(...subscriptions.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('subscriptions_id_seq', ${maxSubscriptionId}, true);`);
  }
  
  if (smsCodes.rows.length > 0) {
    const maxSmsCodeId = Math.max(...smsCodes.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('sms_codes_id_seq', ${maxSmsCodeId}, true);`);
  }
  
  if (blacklist.rows.length > 0) {
    const maxBlacklistId = Math.max(...blacklist.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('blacklist_id_seq', ${maxBlacklistId}, true);`);
  }
  
  if (reactions.rows.length > 0) {
    const maxReactionId = Math.max(...reactions.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('reactions_id_seq', ${maxReactionId}, true);`);
  }
  
  if (messageReactions.rows.length > 0) {
    const maxMessageReactionId = Math.max(...messageReactions.rows.map(r => r.id));
    sqlLines.push(`SELECT setval('message_reactions_id_seq', ${maxMessageReactionId}, true);`);
  }
  
  sqlLines.push('\n-- =====================================================');
  sqlLines.push(`-- EXPORT COMPLETE: ${totalInserts} total INSERT statements`);
  sqlLines.push('-- =====================================================');
  
  await client.end();
  
  // Write to file
  const filename = 'READY_TO_IMPORT.sql';
  writeFileSync(filename, sqlLines.join('\n'), 'utf-8');
  
  console.log(`\n✓ SQL file created: ${filename}`);
  console.log(`✓ Total INSERT statements: ${totalInserts}`);
  console.log(`\nBreakdown:`);
  console.log(`  - Users: ${users.rows.length}`);
  console.log(`  - Messages: ${messages.rows.length}`);
  console.log(`  - Private messages: ${privateMessages.rows.length}`);
  console.log(`  - User photos: ${userPhotos.rows.length}`);
  console.log(`  - Subscriptions: ${subscriptions.rows.length}`);
  console.log(`  - SMS codes: ${smsCodes.rows.length}`);
  console.log(`  - Blacklist: ${blacklist.rows.length}`);
  console.log(`  - Reactions: ${reactions.rows.length}`);
  console.log(`  - Message reactions: ${messageReactions.rows.length}`);
  console.log(`\nFile is ready to import into Timeweb PostgreSQL!`);
}

main().catch(console.error);
