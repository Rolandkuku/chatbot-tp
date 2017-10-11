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
        session.send("Type 'Main menu' to get started");
        session.beginDialog("menu");
    }
]);

var menuItems = {
    "Ask Name": {
        item: "askName"
    },
    "Make a booking": {
        item: "reservation"
    },
    "Ask phone number": {
        item: "phonePrompt"
    }
};

bot.dialog("menu", [
    function (session) {
        builder.Prompts.choice(session, "Menu:", menuItems, {listStyle: builder.ListStyle.button});
    },
    function (session, result) {
        session.beginDialog(menuItems[result.response.entity].item);
    }
]).triggerAction({
    matches: /^main menu$/i,
    confirmPrompt: "This will cancel your request. Are you sure?"
});

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

bot.dialog("phonePrompt", [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, "Enter the number using a format of either: '(555) 123-4567' or '555-123-4567' or '5551234567'")
        } else {
            builder.Prompts.text(session, "What's your phone number?");
        }
    },
    function (session, results) {
        var matched = results.response.match(/\d+/g);
        var number = matched ? matched.join("") : "";
        if (number.length == 10 || number.length == 11) {
            session.userData.phoneNumber = number; // Save the number.
            session.endDialogWithResult({ response: number });
        } else {
            // Repeat the dialog
            session.replaceDialog("phonePrompt", { reprompt: true });
        }
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
]).reloadAction(
    "restartOrderDinner", "Ok. Let's start over.",
    {
        matches: /^start over$/i,
        confirmPrompt: "This wil cancel your booking. Are you sure?"
    }
)
.cancelAction(
    "cancelOrder", "Type 'Main Menu' to continue.",
    {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel your booking. Are you sure?"
    }
);