import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { logger } from '../index.js';

const apiKey = 'Se2KTRqNu22ZPg3KV';

async function InsertNewCity(city, db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();
  db.data ||= { records: [], cities: [] };

  try {
    db.data.cities.push(city);
  } catch (error) {
    logger(error);
  }

  await db.write();
}

async function GetAllCities(db_url) {
  const adapter = new JSONFile(db_url);
  const db = new Low(adapter);
  await db.read();

  return db.data.cities;
}

async function GetWeather(db_url) {
  const promises = [];
  const cities = await GetAllCities(db_url);

  for (let city of cities) {
    promises.push(
      new Promise((resolve, rej) => {
        fetch(
          `https://api.seniverse.com/v3/weather/now.json?key=${apiKey}&location=${city}&language=zh-Hans&unit=c`
        )
          .then((res) => res.json())
          .then((res) => res.results[0].now)
          .then((res) =>
            resolve(`${city}: ${res.text} ${res.temperature}\xB0C`)
          )
          .catch((err) => rej(err));
      })
    );
  }

  return Promise.all(promises);
}

export { InsertNewCity, GetWeather };
