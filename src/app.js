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

app.command('/ticket', async ({ ack, body, client }) => {
    // コマンドのリクエストを確認
    await ack();

    try {
        const result = await client.views.open({
        // 適切な trigger_id を受け取ってから 3 秒以内に渡す
        trigger_id: body.trigger_id,
        // view の値をペイロードに含む
        view: {
            type: 'modal',
            // callback_id が view を特定するための識別子
            callback_id: 'view_1',
            title: {
            type: 'plain_text',
            text: 'Modal title'
            },
            blocks: [
            {
                type: 'section',
                text: {
                type: 'mrkdwn',
                text: 'Welcome to a modal with _blocks_'
                },
                accessory: {
                type: 'button',
                text: {
                    type: 'plain_text',
                    text: 'Click me!'
                },
                action_id: 'button_abc'
                }
            },
            {
                type: 'input',
                block_id: 'input_c',
                label: {
                type: 'plain_text',
                text: 'What are your hopes and dreams?'
                },
                element: {
                type: 'plain_text_input',
                action_id: 'dreamy_input',
                multiline: true
                }
            }
            ],
            submit: {
            type: 'plain_text',
            text: 'Submit'
            }
        }
        });
        console.log(result);
    }
    catch (error) {
        console.error(error);
    }
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();