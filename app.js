var restify = require('restify');
var builder = require('botbuilder');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog("greetings");
    }
]);

bot.dialog("greetings", [
    function (session) {
        session.beginDialog("askName");
    },
    function (session, result) {
        session.userName = result.response;
        session.beginDialog("reservation");
    },
    function (session, result) {
        session.send(
            `Ok ${session.privateConversationData.userName},
            I'll make a booking for ${session.privateConversationData.bookDate}
            in the name of ${session.privateConversationData.bookName}
            for ${session.privateConversationData.nbPeople} people.`
        );
    }
]);

bot.dialog("askName", [
    function (session) {
        builder.Prompts.text(session, "Hi what is your name ?");
    },
    function (session, result) {
        session.privateConversationData.userName = result.response;
        session.endDialogWithResult(result);
    }
]);

bot.dialog("reservation", [
    function (session) {
        builder.Prompts.time(session, "When do you want to book ?");
    },
    function (session, result) {
        session.privateConversationData.bookDate = builder.EntityRecognizer.resolveTime([result.response]);;
        builder.Prompts.text(session, "Right, how many people will attend ?");
    },
    function (session, result) {
        session.privateConversationData.nbPeople = result.response;
        builder.Prompts.text(session, "And finally, who's name should I book for ?");
    },
    function (session, result) {
        session.privateConversationData.bookName = result.response;
        session.endDialog();
    }
]);