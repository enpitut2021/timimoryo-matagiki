const { App } = require("@slack/bolt");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 * 配列の値からランダムで1つ選択して返す
 * @param arr arrayData (required) 選択する配列の内容
 * @return str
 */
function choose_at_random(arrayData) {
  var arrayIndex = Math.floor(Math.random() * arrayData.length);
  return arrayData[arrayIndex];
}

/**
 *
 * @param {string} message 送信したい内容
 * @param {Context} context botTokenが入っている変数
 */
async function logging(message, context) {
  // チャンネルに質問内容を送信
  const channelId = "C029QSVP30C";

  try {
    // トークンを用いて chat.scheduleMessage 関数を呼び出す
    await app.client.chat.postMessage({
      // アプリの初期化に用いたトークンを `context` オブジェクトに保存
      token: context.botToken,
      channel: channelId,
      text: message,
    });
  } catch (error) {
    console.error(error);
  }
}

app.command("/matagiki", async ({ ack, body, client }) => {
  // コマンドのリクエストを確認
  await ack();

  try {
    const result = await client.views.open({
      // 適切な trigger_id を受け取ってから 3 秒以内に渡す
      trigger_id: body.trigger_id,
      // view の値をペイロードに含む
      view: {
        type: "modal",
        // callback_id が view を特定するための識別子
        callback_id: "view_1",
        title: {
          type: "plain_text",
          text: "Modal title",
        },
        blocks: [
          {
            type: "input",
            block_id: "block_1",
            element: {
              type: "plain_text_input",
              multiline: true,
              action_id: "plain_text_input-action",
            },
            label: {
              type: "plain_text",
              text: "質問を教えてください",
              emoji: true,
            },
          },
        ],
        submit: {
          type: "plain_text",
          text: "Submit",
        },
      },
    });
    console.log(result);
  } catch (error) {
    console.error(error);
  }
});

app.message("", async ({ message, context }) => {
  // say() sends a message to the channel where the event was triggered
  logging(
    `<@${message.user}>から受け取りました。
  投稿内容：${message.text}`,
    context
  );
});

// モーダルでのデータ送信イベントを処理します
app.view("view_1", async ({ ack, body, view, client, context }) => {
  // モーダルでのデータ送信イベントを確認
  await ack();

  // 入力値を使ってやりたいことをここで実装 - ここでは DB に保存して送信内容の確認を送っている

  // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
  const val = view["state"]["values"]["block_1"]["plain_text_input-action"];
  const user = body["user"]["id"];

  // ユーザーに対して送信するメッセージ
  const msg = `あなたの質問「${val.value}」を受け付けました`;

  logging(`<@${body.user.name}>「${val.value}」`, context);

  const user_list = await app.client.users.list();
  const send_user = choose_at_random(user_list.members);

  // ユーザーにメッセージを送信
  try {
    await client.chat.postMessage({
      channel: user,
      text: msg,
    });
  } catch (error) {
    console.error(error);
  }

  const send_msg = `<@${send_user.id}> チーム魑魅魍魎です．
  私たちのチームは「質問をいい感じの人から答えてもらえるslack bot」を作る予定で，現在は手動で運用しています．
  <@${body.user.name}>さんからの質問で「${val.value}」という質問が来ています．
  お答えできそうなら返信ください．他にいい人がいる場合はその人を教えてください！
  よろしくお願いいたします．`;

  logging(send_msg, context);

  try {
    await client.chat.postMessage({
      channel: send_user.id,
      text: send_msg,
    });
  } catch (error) {
    console.error(error);
  }
});

app.message("hello", async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "This is a section block with a button.",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "自分で回答する",
              emoji: true,
            },
            value: "自分で回答する",
            action_id: "button_self-answer",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "他の人を紹介する",
              emoji: true,
            },
            value: "他の人を紹介する",
            action_id: "button_throw-other",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "遠慮しておく",
              emoji: true,
            },
            value: "遠慮しておく",
            action_id: "button_pass",
          },
        ],
      },
    ],
    text: `Hey there <@${message.user}>!`,
  });
});

app.action("button_self-answer", async ({ ack, say }) => {
  await ack();

  await say("ありがとうございます！直接回答を入力してください。");
});

app.action("button_throw-other", async ({ ack, say }) => {
  await ack();

  await say("ありがとうございます！誰に質問をパスするか直接入力してください。");
});

app.action("button_pass", async ({ ack, say }) => {
  await ack();

  await say("ありがとうございました。");
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
