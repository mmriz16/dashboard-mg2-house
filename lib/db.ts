import { Pool } from "pg";

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function ensureChatTables() {
  await db.query(`
    create table if not exists chat_conversations (
      id bigserial primary key,
      user_id text not null,
      key text not null default 'default',
      title text,
      openclaw_session_key text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, key)
    );
  `);

  await db.query(`
    alter table chat_conversations
    add column if not exists title text;
  `);

  await db.query(`
    create table if not exists chat_messages (
      id bigserial primary key,
      user_id text not null,
      conversation_key text not null default 'default',
      sender text not null check (sender in ('user','agent')),
      content text not null,
      ts bigint not null,
      model_id text,
      usage_label text,
      created_at timestamptz not null default now()
    );
  `);

  await db.query(`
    create index if not exists idx_chat_messages_user_conv_ts
      on chat_messages(user_id, conversation_key, ts);
  `);
}
