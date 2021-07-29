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
app.command('/echo', async ({command, ack, say}) => {
    // コマンドリクエストを確認
    await ack();

    await say(`${command.text}`);
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();