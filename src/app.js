const { App } = require("@slack/bolt");
require("dotenv").config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

/**
 *
 * @param {string} message 送信したい内容
 */
async function logging(message) {
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
  const user_list = app.client.users.list
  console.log(user_list)
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

// モーダルでのデータ送信イベントを処理します
app.view("view_1", async ({ ack, body, view, client, context }) => {
  // モーダルでのデータ送信イベントを確認
  await ack();

  console.log(body);

  // 入力値を使ってやりたいことをここで実装 - ここでは DB に保存して送信内容の確認を送っている

  // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
  const val = view["state"]["values"]["block_1"]["plain_text_input-action"];
  const user = body["user"]["id"];

  // ユーザーに対して送信するメッセージ
  const msg = `あなたの質問「${val.value}」を受け付けました`;

  logging(`<@${body.user.name}>「${val.value}」`);

  // ユーザーにメッセージを送信
  try {
    await client.chat.postMessage({
      channel: user,
      text: msg,
    });
  } catch (error) {
    console.error(error);
  }
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
