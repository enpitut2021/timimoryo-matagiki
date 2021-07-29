const {App} = require("@slack/bolt");
require("dotenv").config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Listens to incoming messages that contain "hello"
// app.message('', async ({message, say}) => {
//     // say() sends a message to the channel where the event was triggered
//     await say(`${message.text}`);
// });

// この echo コマンドは ただ、その引数を（やまびこのように）おうむ返しする
app.command('/matagiki', async ({command, ack, say, context}) => {
    // コマンドリクエストを確認
    await ack();

    await say(`「${command.text}」> 質問受け付けました．しばらくお待ちください．`);

    const channelId = 'C029QSVP30C'

    try {
        // トークンを用いて chat.scheduleMessage 関数を呼び出す
        const result = await app.client.chat.postMessage({
            // アプリの初期化に用いたトークンを `context` オブジェクトに保存
            token: context.botToken,
            channel: channelId,
            text: `<@${command.user_name}>「${command.text}」`
        });
    } catch (error) {
        console.error(error);
    }
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();