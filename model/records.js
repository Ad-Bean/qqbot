import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { logger } from '../index.js';

async function InsertNewRecord(record, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();
  db.data ||= { records: [] };

  try {
    db.data.records.push(record);
  } catch (error) {
    logger(error);
  }

  await db.write();
}

async function GetAllRecords(db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  return db.data.records;
}

export { InsertNewRecord, GetAllRecords };
