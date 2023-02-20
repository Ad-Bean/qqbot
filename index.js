import WebSocket from 'ws';
import { JSONFile } from 'lowdb/node';
import { Low } from 'lowdb';
import moment from 'moment';
import { GetAllRecords, InsertNewRecord } from './model/records.js';
import { GetWeather, InsertNewCity } from './model/weather.js';
import {
  GetFoodById,
  GetRandomRecommend,
  InsertFoodById,
  InsertNewFood,
} from './model/food.js';
import * as dotenv from 'dotenv';
import {
  GetAllTodo,
  GetTodayTodoById,
  GetTodoById,
  InsertNewTodo,
  UpdateTodoByIndex,
} from './model/todolist.js';

const WS_URL = 'ws://localhost:8686';
const HTTP_URL = 'http://localhost:5700';
const DB_URL = './model/db.json';

const ws = new WebSocket(WS_URL);

const adapter = new JSONFile(DB_URL);
const db = new Low(adapter);

const init = async () => {
  dotenv.config();
  moment.locale('zh-CN');
  await db.read();
  db.data ||= { records: [], cities: [], food: [], recommend: [], todo: [] };
  await db.write();
};

init();

const logger = (msg) => {
  const current = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log(`[${current}]: ${msg}`);
};

ws.on('open', function () {
  logger('Connected to the WebSocket server');
});

ws.on('close', function () {
  logger('Disconnected from the WebSocket server');
});

ws.onmessage = (e) => {
  const {
    post_type,
    group_id,
    message,
    message_type,
    raw_message,
    user_id,
    sender,
    message_id,
    target_id,
  } = JSON.parse(e.data);

  if (post_type === 'notice' && target_id == process.env.BOT_ID) {
    ws.send(
      JSON.stringify(
        makeSendGroupCGBody(group_id, [
          { type: 'at', data: { qq: process.env.PEANUT_ID } },
          { type: 'text', data: { text: '豪哥，单词' } },
        ])
      )
    );
  }

  if (post_type === 'message') {
    if (message.startsWith('打卡：')) {
      const text = `${moment().format('YYYY-MM-DD HH:mm:ss dddd')} 打卡成功`;
      const buffer = JSON.stringify(
        makeSendGroupCGBody(group_id, [
          { type: 'at', data: { qq: user_id } },
          { type: 'text', data: { text: text } },
        ])
      );
      ws.send(buffer);

      InsertNewRecord(makeRecord(user_id, sender, message), DB_URL);
    }

    if (message === '摸鱼') {
      if (Math.random() > 0.1) {
        fetch('https://api.j4u.ink/v1/store/other/proxy/remote/moyu.json')
          .then((res) => res.json())
          .then((res) => {
            fetch(res.data.moyu_url).then((pic) => {
              const buffer = JSON.stringify(
                makeSendGroupCGBody(group_id, [
                  {
                    type: 'image',
                    data: {
                      file: pic.url,
                    },
                  },
                ])
              );
              ws.send(buffer);
            });
          })
          .catch((err) => {
            logger(err);
            const buffer = JSON.stringify(
              makeSendGroupCGBody(group_id, [
                { type: 'text', data: { text: '别摸辣！' } },
              ])
            );
            ws.send(buffer);
          });
      } else {
        const buffer = JSON.stringify(
          makeSendGroupCGBody(group_id, [
            { type: 'text', data: { text: '别摸辣！' } },
          ])
        );
        ws.send(buffer);
      }
    }

    if (message === '天气') {
      GetWeather(DB_URL).then((res) => {
        const text =
          `${moment().format('YYYY-MM-DD HH:mm:ss dddd')} \n` + res.join('\n');
        const buffer = JSON.stringify(
          makeSendGroupCGBody(group_id, [
            { type: 'text', data: { text: text } },
          ])
        );
        ws.send(buffer);
      });
    }

    if (message.startsWith('添加城市：')) {
      const city = message.substring(5);
      InsertNewCity(city, DB_URL);

      const text = `${moment().format(
        'YYYY-MM-DD HH:mm:ss dddd'
      )} 城市添加成功`;
      const buffer = JSON.stringify(
        makeSendGroupCGBody(group_id, [
          { type: 'at', data: { qq: user_id } },
          { type: 'text', data: { text: text } },
        ])
      );
      ws.send(buffer);
    }

    if (message === '查询打卡') {
      GetAllRecords(DB_URL)
        .then((records) => {
          const today = moment().format('YYYY-MM-DD');
          const wk = moment().format('dddd');

          const todays = records.filter(
            (record) =>
              moment(record.time).isSame(today, 'day') && record.id === user_id
          );

          const msg = todays.map(
            (v) => `${v.time.split(' ')[1]} ：${v.record}`
          );

          const text = `${
            sender.card ? sender.card : sender.nickname
          } ${today} ${wk} 打卡情况如下：\n${msg.join('\n')}`;

          ws.send(
            JSON.stringify(
              makeSendGroupCGBody(group_id, [
                { type: 'text', data: { text: text } },
              ])
            )
          );
        })
        .catch((err) => logger(err));
    }

    if (message === '#帮助') {
      const commands = [
        '发送【查询打卡】查询今日自己的打卡情况',
        '发送【打卡：内容】进行打卡',
        '发送【添加城市：城市】将城市添加到天气列表',
        '发送【天气】获取今日天气',
        '发送【摸鱼】进行摸鱼',
        '发送【吃什么】随机抽取自定义和推荐食物',
        '发送【我想吃：麦当劳 麦当劳】进行添加自定义食物',
        '\n',
        '发送【查询待办】查看所有当日待办',
        '发送【完成：序号】完成当日指定待办',
        '\n',
        '戳一戳机器人，提醒豪哥背单词',
        '发送【提醒豪哥】提醒豪哥该背单词了',
      ];

      ws.send(
        JSON.stringify(
          makeSendGroupCGBody(group_id, [
            { type: 'text', data: { text: commands.join('\n') } },
          ])
        )
      );
    }

    if (message.startsWith('我想吃：')) {
      const needed = message.substring(4).split(' ');
      GetFoodById(user_id, DB_URL).then((res) => {
        if (res.length) {
          InsertFoodById(user_id, needed, DB_URL).then((res) => {
            ws.send(
              JSON.stringify(
                makeSendGroupCGBody(group_id, [
                  { type: 'at', data: { qq: user_id } },
                  { type: 'text', data: { text: '已添加辣' } },
                ])
              )
            );
          });
        } else {
          InsertNewFood(
            {
              id: user_id,
              name: sender.card ? sender.card : sender.nickname,
              food: needed,
            },
            DB_URL
          ).then((res) => {
            ws.send(
              JSON.stringify(
                makeSendGroupCGBody(group_id, [
                  { type: 'at', data: { qq: user_id } },
                  { type: 'text', data: { text: '已添加辣' } },
                ])
              )
            );
          });
        }
      });
    }

    if (message === '吃什么') {
      GetFoodById(user_id, DB_URL).then((res) => {
        let sendText = '';
        if (res.length) {
          const custom = [];
          for (let i = 0; i < 5; ++i) {
            const idx = Math.floor(Math.random() * res[0].food.length);
            custom.push(res[0].food[idx]);
          }
          sendText += '你平常吃：' + custom.join(', ') + '\n';
        }

        GetRandomRecommend(DB_URL).then((rec) => {
          sendText += '推荐你吃：' + rec.join(', ');
          if (Math.random() > 0.1) {
            ws.send(
              JSON.stringify(
                makeSendGroupCGBody(group_id, [
                  { type: 'text', data: { text: sendText } },
                ])
              )
            );
          } else {
            ws.send(
              JSON.stringify(
                makeSendGroupCGBody(group_id, [
                  { type: 'text', data: { text: '天天就知道吃，不准吃！' } },
                ])
              )
            );
          }
        });
      });
    }

    if (message.startsWith('每日待办：')) {
      const todo = message.substring(5);
      const newTodo = {
        id: user_id,
        name: sender.card ? sender.card : sender.nickname,
        todo: todo,
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
        done: false,
      };

      InsertNewTodo(newTodo, DB_URL).then((res) => {
        ws.send(
          JSON.stringify(
            makeSendGroupCGBody(group_id, [
              { type: 'at', data: { qq: user_id } },
              {
                type: 'text',
                data: {
                  text: '添加待办成功，将在每日固定时间提醒你完成任务，完成请输入【完成：序号】如【完成：1】完成当日第一条待办',
                },
              },
            ])
          )
        );
      });
    }

    if (message === '查询待办') {
      const today = moment().format('YYYY-MM-DD HH:mm:ss');
      GetAllTodo(DB_URL).then((res) => {
        let todo = '';
        res?.map((t, idx) => {
          if (moment(t.time).isSame(today, 'day')) {
            todo += `[${idx + 1}]: ${moment(t.time).format('HH:mm')} ${
              t.name
            }：${t.todo} ${t.done ? '（完成）' : '（未完成）'}\n`;
          }
        });

        if (todo) {
          const text =
            `现在是 ${moment().format(
              'HH:mm:ss dddd'
            )}，今天所有成员的待办任务：\n` +
            todo +
            '使用【完成：序号】完成指定序号待办任务';
          sendGroupMessage(group_id, text);
        } else {
          sendGroupMessage(
            group_id,
            '今天暂未有待办任务，使用【每日待办：内容】添加每日待办清单'
          );
        }
      });
    }

    if (message.startsWith('完成：')) {
      const idx = message.substring(3);
      UpdateTodoByIndex(idx - 1, user_id, DB_URL).then((res) => {
        if (res) {
          ws.send(
            JSON.stringify(
              makeSendGroupCGBody(group_id, [
                { type: 'at', data: { qq: user_id } },
                {
                  type: 'text',
                  data: { text: '恭喜你，你已完成该任务，继续加油！' },
                },
              ])
            )
          );
        } else {
          ws.send(
            JSON.stringify(
              makeSendGroupCGBody(group_id, [
                { type: 'at', data: { qq: user_id } },
                {
                  type: 'text',
                  data: {
                    text: '完成任务失败，你不是本人或任务已完成！',
                  },
                },
              ])
            )
          );
        }
      });
    }

    if (message === '提醒豪哥') {
      const newTodo = {
        id: process.env.PEANUT_ID,
        name: '花生',
        todo: '该背单词了',
        time: moment().format('YYYY-MM-DD HH:mm:ss'),
        done: false,
      };

      InsertNewTodo(newTodo, DB_URL).then((res) => {
        ws.send(
          JSON.stringify(
            makeSendGroupCGBody(group_id, [
              { type: 'at', data: { qq: process.env.PEANUT_ID } },
              {
                type: 'text',
                data: { text: '豪哥，该背单词了！！！' },
              },
            ])
          )
        );
      });
    }
  }
};

ws.onerror = (e) => {
  logger(e);
};

export { logger };

const sendGroupMessage = (group_id, text) => {
  ws.send(
    JSON.stringify(
      makeSendGroupCGBody(group_id, [{ type: 'text', data: { text: text } }])
    )
  );
};

const makeSendGroupCGBody = (group_id, msg) => {
  const obj = {
    action: 'send_group_msg',
    params: {
      message_type: 'group',
      group_id: group_id,
      message: [...msg],
    },
  };

  return obj;
};

const makeRecord = (user_id, sender, message) => {
  const record = {
    id: user_id,
    name: sender.card ? sender.card : sender.nickname,
    time: moment().format('YYYY-MM-DD HH:mm:ss'),
    weekday: moment().format('dddd'),
    record: message.substring(3),
  };

  return record;
};

const broadcast = async () => {
  const hhmm = moment().format('HH:mm');
  const ss = moment().format('ss');
  const wk = moment().format('dddd');

  if (hhmm === '23:59' && ss <= 4 && ss >= 0) {
    const today = moment().format('YYYY-MM-DD HH:mm:ss');
    const records = await GetAllRecords(DB_URL);
    const todays = records.filter((record) =>
      moment(record.time).isSame(today, 'day')
    );

    const msg = todays.map(
      (v) => `${v.time.split(' ')[1]} ${v.name}：${v.record}`
    );
    const text = `${today} ${wk} 今日打卡情况如下：\n${msg.join(
      '\n'
    )} \n明天请继续加油！`;
    ws.send(
      JSON.stringify(
        makeSendGroupCGBody(process.env.GROUP_ID, [
          { type: 'text', data: { text: text } },
        ])
      )
    );
  } else if (hhmm === '08:00' && ss <= 4 && ss >= 0) {
    GetWeather(DB_URL).then((res) => {
      const text =
        `早上好，现在是 ${moment().format('YYYY-MM-DD HH:mm:ss dddd')} \n` +
        res.join('\n') +
        '\n新的一天，大家加油！';
      const buffer = JSON.stringify(
        makeSendGroupCGBody(process.env.GROUP_ID, [
          { type: 'text', data: { text: text } },
        ])
      );
      ws.send(buffer);
    });
  }
};

const reminders = [
  { hhmm: '08:00', message: '早上好' },
  { hhmm: '10:00', message: '早上好' },
  { hhmm: '12:00', message: '中午好' },
  { hhmm: '14:00', message: '中午好' },
  { hhmm: '16:00', message: '下午好' },
  { hhmm: '18:00', message: '下午好' },
  { hhmm: '20:00', message: '晚上好' },
  { hhmm: '22:00', message: '晚上好' },
];

const todoList = async () => {
  const hhmm = moment().format('HH:mm');
  const ss = moment().format('ss');
  const wk = moment().format('dddd');
  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  for (const reminder of reminders) {
    if (hhmm === reminder.hhmm && ss <= 4 && ss >= 0) {
      GetAllTodo(DB_URL).then((res) => {
        const greeting = `${reminder.message}，现在是${wk} ${hhmm}，今天你的任务完成了吗：\n`;
        const cgbody = [];
        res?.map((todo) => {
          if (moment(todo.time).isSame(today, 'day') && !todo.done) {
            cgbody.push({ type: 'at', data: { qq: todo.id } });
            cgbody.push({ type: 'text', data: { text: todo.todo + '\n' } });
          }
        });
        if (cgbody.length) {
          ws.send(
            JSON.stringify(
              makeSendGroupCGBody(process.env.GROUP_ID, [
                { type: 'text', data: { text: greeting } },
                ...cgbody,
              ])
            )
          );
        } else {
          sendGroupMessage(
            group_id,
            `${reminder.message}，现在是${wk} ${hhmm}，今天还没有待办任务！`
          );
        }
      });
    }
  }
};

setInterval(broadcast, 5000);
setInterval(todoList, 5000);
