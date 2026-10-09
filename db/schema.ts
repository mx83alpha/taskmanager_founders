import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const quests=sqliteTable('quests',{id:text('id').primaryKey(),title:text('title').notNull(),category:text('category').notNull(),xp:integer('xp').notNull(),minutes:integer('minutes').notNull(),doneAt:text('done_at')});
