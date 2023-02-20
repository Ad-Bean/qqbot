import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import moment from 'moment';
import { logger } from '../index.js';

async function InsertNewTodo(todo, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();
  db.data ||= { todo: [] };

  try {
    db.data.todo.push(todo);
  } catch (error) {
    logger(error);
  }

  await db.write();
}

async function GetAllTodo(db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  return db.data.todo;
}

async function GetTodoById(id, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  return db.data.todo.filter((t) => t.id === id);
}

async function GetTodayTodoById(id, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  return db.data.todo.filter(
    (t) => t.id === id && moment(t.time).isSame(today, 'day')
  );
}

async function UpdateTodoByIndex(idx, user_id, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  if (idx >= db.data.todo.length) {
    return false;
  }

  if (db.data.todo[idx].done || user_id != db.data.todo[idx].id) {
    return false;
  }

  db.data.todo[idx].done = true;

  await db.write();

  return true;
}

export {
  InsertNewTodo,
  GetAllTodo,
  GetTodoById,
  GetTodayTodoById,
  UpdateTodoByIndex,
};
