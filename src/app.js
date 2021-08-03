const {App} = require("@slack/bolt");
const {firestore} = require("firebase-admin");
require("dotenv").config();

var admin = require("firebase-admin");

var serviceAccount = require("../firebase.key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

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
    const channelId = process.env.SLACK_LOG_CHANNEL_ID;

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

/**
 * 質問者から回答候補者に質問を送信する
 *
 * @param {string} question 質問文本体
 * @param {string} from_name 質問者のユーザー表示名
 * @param {string} to_id 回答候補者のユーザーID
 * @param {string} question_collection_id 質問のコレクションID
 */
function generate_question_object(question, from_name, to_id, question_collection_id) {
    const question_message = `<@${to_id}> チーム魑魅魍魎です．
  私たちのチームは「質問をいい感じの人から答えてもらえるslack bot」を作る予定で，現在は手動で運用しています．
  <@${from_name}>さんからの質問で「${question}」という質問が来ています．
  お答えできそうなら返信ください．他にいい人がいる場合はその人を教えてください！
  よろしくお願いいたします．`;

    const question_object = {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: question_message,
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
                        value: `${question_collection_id}`,
                        action_id: "button_self-answer",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "他の人を紹介する",
                            emoji: true,
                        },
                        value: `${question_collection_id}`,
                        action_id: "button_throw-other",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "遠慮しておく",
                            emoji: true,
                        },
                        value: `${question_collection_id}`,
                        action_id: "button_pass",
                    },
                ],
            },
        ],
        text: "質問が送信されました．",
    };
    return question_object;
}

async function get_answerer_id_from_question_id(question_id) {
    const answers_querysnap = await admin.firestore().collection('questions').doc(question_id).collection('answers').get();
    const answer_snapshot = answers_querysnap.docs[0];
    const answer = answer_snapshot.data()
    return answer.answerer_id
}


app.command("/matagiki", async ({ack, body, client}) => {
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

app.message("", async ({message, context}) => {
    // say() sends a message to the channel where the event was triggered
    logging(
        `<@${message.user}>から受け取りました。
  投稿内容：${message.text}`,
        context
    );
});

// モーダルでのデータ送信イベントを処理します
app.view("view_1", async ({ack, body, view, client, context}) => {
    // モーダルでのデータ送信イベントを確認
    await ack();

    // 入力値を使ってやりたいことをここで実装 - ここでは DB に保存して送信内容の確認を送っている

    // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
    const question_msg =
        view.state.values.block_1["plain_text_input-action"].value;

    // ユーザーに対して送信するメッセージ
    const msg = `あなたの質問「${question_msg}」を受け付けました`;

    logging(`Question: <@${body.user.name}>「${question_msg}」`, context);

    const user_list = await app.client.users.list();
    const sendable_user_list = user_list.members.filter(
        // Pythonでいうと `lamda member: memberがbotではない && memberが送った人ではない`

        // TODO: SlackBotを弾く
        (member) =>
            !member.is_bot && !member.is_workflow_bot && member.id !== body.user.id
    );

    console.log(sendable_user_list);
    const send_user = choose_at_random(sendable_user_list);

    const question_data = {
        question: question_msg,
        questioner_name: body.user.name,
        questioner_id: body.user.id,
        created_at: ""  // TODO
    }


    question_collection_id = save_question_to_firebase(question_data) // TODO

    console.log('question_data', question_data)
    console.log('answer_data', answers_data)


    // ユーザーにメッセージを送信
    try {
        await client.chat.postMessage({
            channel: body.user.id,
            text: msg,
        });
    } catch (error) {
        console.error(error);
    }

    const question_object = generate_question_object(
        question_msg,
        body.user.name,
        send_user.id,
        question_collection_id
    );

    const send_msg = question_object.blocks[0].text.text;

    logging(send_msg, context);

    try {
        await client.chat.postMessage({
            channel: send_user.id,
            text: send_msg,
            blocks: question_object.blocks,
        });
    } catch (error) {
        console.error(error);
    }
});

/**
 * 質問者から回答候補者に質問を送信する
 *
 * @param {string} question_msg 質問文本体
 * @param {string} answer_msg 回答文本体
 * @param {string} from_name 回答者のユーザー表示名
 * @param {string} to_id 質問者のユーザーID
 * @param {string} answer_collection_id 回答のコレクションID
 */
function generate_answer_object(question_msg, answer_msg, from_name, to_id, answer_collection_id) {
    const question_message = `「${question_msg}」という質問の回答として<@${from_name}>さんから「${answer_msg}}」という回答が返ってきています．
  是非、お礼をいいましょう!!`;

    const answer_object = {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: question_message,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "お礼をする",
                            emoji: true,
                        },
                        value: `${answer_collection_id}`,
                        action_id: "button_thanks_to_answerer",
                    },
                ],
            },
        ],
        text: "質問が送信されました．",
    };
    return answer_object;
}

app.action("button_self-answer", async ({view, ack, body, say, context}) => {
    await ack();
    logging(
        `<@${body.user.name}>さんが直接自分で回答するを選択しました`,
        context
    );
    const question_collection_id =
        view.state.values.block_1["button_self-answer"].value;

    try {
        const result = await client.views.open({
            // 適切な trigger_id を受け取ってから 3 秒以内に渡す
            trigger_id: body.trigger_id,
            // view の値をペイロードに含む
            view: {
                type: "modal",
                // callback_id が view を特定するための識別子
                callback_id: "view_answer",
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
                            text: "ありがとうございます！直接回答を入力してください。",
                            emoji: true,
                        },
                    },
                    {
                        "type": "input",
                        "element": {
                            "type": "static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "1つ目の選択肢を選んでください。",
                                "emoji": true
                            },
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "こちらを選んでください",
                                        "emoji": true
                                    },
                                    "value": `${question_collection_id}`
                                }
                            ],
                            "action_id": "static_select-action"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "質問ID",
                            "emoji": true
                        }
                    }
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

// モーダルでのデータ送信イベントを処理します．回答用
app.view("view_answer", async ({ack, body, view, client, context}) => {
    // モーダルでのデータ送信イベントを確認
    await ack();

    // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
    const answer_msg =
        view.state.values.block_1["plain_text_input-action"].value;
    const question_collection_id =
        view.state.values.block_1["static_select-action"].value;

    const answers_data =
        {
            answer: answer_msg,
            answerer_id: body.user.id,
            answerer_name: body.user.name,
            created_at: ""  // TODO
        }

    const answer_collection_id = save_answer_to_firebase(answers_data, question_collection_id);  // TODO
    const question_msg = pick_question_msg(question_collection_id)

    // ユーザーに対して送信するメッセージ
    const msg = `あなたの回答「${answer_msg}」を受け付けました`;

    logging(`Answer: <@${body.user.name}>「${answer_msg}」`, context);

    const send_user = pick_questioner_name(question_collection_id); // TODO

    const answer_object = generate_answer_object(
        question_msg,
        answer_msg,
        body.user.name,
        send_user.id,
        answer_collection_id
    );

    const send_msg = answer_object.blocks[0].text.text;

    logging(send_msg, context);

    try {
        await client.chat.postMessage({
            channel: send_user.id,
            text: send_msg,
            blocks: answer_object.blocks,
        });
    } catch (error) {
        console.error(error);
    }

    try {
        await client.chat.postMessage({
            channel: body.user.id,
            text: msg,
        });
    } catch (error) {
        console.error(error);
    }

});

app.action("button_thanks_to_answerer", async ({ack, body, say, context}) => {
    await ack();
    logging(`<@${body.user.name}>さんがお礼をするそうです`, context);
    const answer_collection_id =
        view.state.values.block_1["button_thanks_to_answerer"].value;
    try {
        const result = await client.views.open({
            // 適切な trigger_id を受け取ってから 3 秒以内に渡す
            trigger_id: body.trigger_id,
            // view の値をペイロードに含む
            view: {
                type: "modal",
                // callback_id が view を特定するための識別子
                callback_id: "view_throw_thanks_to_answerer",
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
                            text: "お礼を書いてください",
                            emoji: true,
                        },
                    },
                    {
                        "type": "input",
                        "element": {
                            "type": "static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "1つ目の選択肢を選んでください。",
                                "emoji": true
                            },
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "こちらを選んでください",
                                        "emoji": true
                                    },
                                    "value": `${answer_collection_id}`
                                }
                            ],
                            "action_id": "static_select-action"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "回答ID",
                            "emoji": true
                        }
                    }
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

// モーダルでのデータ送信イベントを処理します．回答用
app.view("view_throw_thanks_to_answerer", async ({ack, body, view, client, context}) => {
    // モーダルでのデータ送信イベントを確認
    await ack();

    // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
    const thanks_msg =
        view.state.values.block_1["plain_text_input-action"].value;
    const answer_collection_id =
        view.state.values.block_1["static_select-action"].value;

    const send_user = pick_answerer_name(answer_collection_id);

    // ユーザーに対して送信するメッセージ
    const msg = `あなたのお礼「${thanks_msg}」を<@${send_user}>に送信しました。`;

    logging(`Thanks: <@${body.user.name}>「${thanks_msg}」`, context);

    try {
        await client.chat.postMessage({
            channel: send_user.id,
            text: `<@${body.user.name}>からお礼が届きました！
            「${thanks_msg}」`,
        });
    } catch (error) {
        console.error(error);
    }

    try {
        await client.chat.postMessage({
            channel: body.user.id,
            text: msg,
        });
    } catch (error) {
        console.error(error);
    }
});

app.action("button_throw-other", async ({ack, body, say, context}) => {
    await ack();
    logging(`<@${body.user.name}>さんが質問をパスすることにしました`, context);
    const question_collection_id =
        view.state.values.block_1["button_throw-other"].value;
    try {
        const result = await client.views.open({
            // 適切な trigger_id を受け取ってから 3 秒以内に渡す
            trigger_id: body.trigger_id,
            // view の値をペイロードに含む
            view: {
                type: "modal",
                // callback_id が view を特定するための識別子
                callback_id: "view_throw_question_to_other",
                title: {
                    type: "plain_text",
                    text: "Modal title",
                },
                "blocks": [
                    {
                        "type": "input",
                        "element": {
                            "type": "multi_users_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Select users",
                                "emoji": true
                            },
                            "action_id": "multi_users_select-action"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "質問をパスするユーザを選択してください",
                            "emoji": true
                        }
                    },
                    {
                        "type": "input",
                        "element": {
                            "type": "static_select",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "1つ目の選択肢を選んでください。",
                                "emoji": true
                            },
                            "options": [
                                {
                                    "text": {
                                        "type": "plain_text",
                                        "text": "こちらを選んでください",
                                        "emoji": true
                                    },
                                    "value": `${question_collection_id}`
                                }
                            ],
                            "action_id": "static_select-action"
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "質問ID",
                            "emoji": true
                        }
                    }
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

/**
 * 質問者から回答候補者に質問を送信する
 *
 * @param {string} question 質問文本体
 * @param {string} from_name 質問者のユーザー表示名
 * @param {string} to_id 回答候補者のユーザーID
 * @param {string} recommend_user 推薦したユーザID
 * @param {strign} question_collection_id 質問のコレクションID
 */
function generate_question_object_recommend_version(question, from_name, to_id, recommend_user, question_collection_id) {
    const question_message = `<@${to_id}> チーム魑魅魍魎です．
  私たちのチームは「質問をいい感じの人から答えてもらえるslack bot」を作る予定で，現在は手動で運用しています．
  <@${from_name}>さんからの質問で「${question}」という質問が来ています．
  <@${recommend_user}>さんから<@${to_id}>さんが上記の質問に答えられると紹介されました．
  お答えできそうなら返信ください．他にいい人がいる場合はその人を教えてください！
  よろしくお願いいたします．`;

    const question_object = {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: question_message,
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
                        value: `${question_collection_id}`,
                        action_id: "button_self-answer",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "他の人を紹介する",
                            emoji: true,
                        },
                        value: `${question_collection_id}`,
                        action_id: "button_throw-other",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "遠慮しておく",
                            emoji: true,
                        },
                        value: `${question_collection_id}`,
                        action_id: "button_pass",
                    },
                ],
            },
        ],
        text: "質問が送信されました．",
    };
    return question_object;
}

// モーダルでのデータ送信イベントを処理します．回答用
app.view("view_throw_question_to_other", async ({ack, body, view, client, context}) => {
    // モーダルでのデータ送信イベントを確認
    await ack();

    // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
    const question_collection_id =
        view.state.values.block_1["static_select-action"].value;
    const send_user =
        view.state.values.block_1["multi_users_select-action"].value;

    question_msg = pick_question_msg(question_collection_id); // TODO
    question_questioner_name = pick_questioner_name(question_collection_id);  // TODO

    logging(`<@${body.user.name}>質問を<@${question_questioner_name}>にパスしました`, context);

    const answers_data =
        {
            answer: `${body.user.name}が質問を${question_questioner_name}にパスしました`,
            answerer_id: body.user.id,
            answerer_name: body.user.name,
            created_at: ""  // TODO
        }

    answer_collection_id = save_answer_to_firebase(answers_data, question_collection_id); // TODO

    const question_object = generate_question_object_recommend_version(
        /*質問内容*/question_msg,
        /*質問者*/question_questioner_name,
        /*被推薦者*/send_user,
        /*推薦者*/body.user.name,
        /*質問ID*/question_collection_id
    );

    const send_msg = question_object.blocks[0].text.text;

    logging(send_msg, context);

    try {
        await client.chat.postMessage({
            channel: send_user.id,
            text: send_msg,
            blocks: question_object.blocks,
        });
    } catch (error) {
        console.error(error);
    }
});

app.action("button_pass", async ({ack, body, say, context, view}) => {
    await ack();
    logging(`<@${body.user.name}>さんが何もしないことにしました`, context);

    const question_collection_id = view.state.values.block_1["button_pass"].value;

    // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
    const question_msg = pick_question_msg(question_collection_id); // TODO
    const question_questioner_name = pick_questioner_name(question_collection_id);  // TODO
    const question_questioner_id = pick_questioner_id(question_collection_id);  // TODO

    const user_list = await app.client.users.list();
    const sendable_user_list = user_list.members.filter(
        // Pythonでいうと `lamda member: memberがbotではない && memberが送った人ではない`

        // TODO: 今までの回答者を除く
        (member) =>
            !member.is_bot && !member.is_workflow_bot && member.id !== body.user.id
    );

    console.log(sendable_user_list);
    const send_user = choose_at_random(sendable_user_list);


    const question_object = generate_question_object(
        question_msg,
        question_questioner_name,
        question_questioner_id,
        question_collection_id
    );

    const send_msg = question_object.blocks[0].text.text;

    logging(send_msg, context);

    try {
        await client.chat.postMessage({
            channel: send_user.id,
            text: send_msg,
            blocks: question_object.blocks,
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
