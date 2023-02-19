import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { logger } from '../index.js';

async function InsertNewFood(food, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();
  db.data ||= { food: [], recommend: [] };

  try {
    db.data.food.push(food);
  } catch (error) {
    logger(error);
  }

  await db.write();
}

async function GetAllFood(db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  return db.data.food;
}

async function GetFoodById(id, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  return db.data.food.filter((f) => f.id === id);
}

async function GetRandomRecommend(db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  const recomm = [];
  for (let i = 0; i < 5; ++i) {
    const idx = Math.floor(Math.random() * db.data.recommend.length);
    recomm.push(db.data.recommend[idx]);
  }

  return recomm;
}

async function InsertFoodById(id, new_food, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  db.data.food = db.data.food.map((f) => {
    if (f.id == id) {
      f.food = [...f.food, ...new_food];
    }
    return f;
  });

  await db.write();
}

export {
  InsertNewFood,
  GetAllFood,
  GetFoodById,
  InsertFoodById,
  GetRandomRecommend,
};
