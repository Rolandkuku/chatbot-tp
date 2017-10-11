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

bot.on("conversationUpdate", function (activity) {
    activity.membersAdded.forEach(function (member) {
        if(member.name === "User") {
            var reply = new builder.Message()
            .address(activity.address)
            .text(`Hello ${member.name}, please type "Main menu" to get started.`);
            bot.send(reply);
        }
    });
});

var menuItems = {
    "Give my name": {
        item: "askName"
    },
    "Give my phone number number": {
        item: "phonePrompt"
    },
    "Make a booking": {
        item: "reservation"
    },
    "Quit this": {
        item: "endConversation"
    }
};

bot.dialog("endConversation", [
    function (session) {
        if (session.userData.userName) {
            session.send(`It as been a pleasure, ${session.userData.userName}, see you later.`);
        }
        else {
            session.send(`It as been a pleasure, see you later.`);
        }
        session.userData = {};
        session.endConversation();
    }
])

bot.dialog("menu", [
    function (session) {
        builder.Prompts.choice(session, "Menu:", menuItems, {listStyle: builder.ListStyle.button});
    },
    function (session, result) {
        session.beginDialog(menuItems[result.response.entity].item);
    },
    function (session) {
        session.replaceDialog("menu");
    }
]).triggerAction({
    matches: /^main menu$/i,
    confirmPrompt: "This will cancel your request. Are you sure?"
});

bot.dialog("askName", [
    function (session) {
        builder.Prompts.text(session, "What is your name ?");
    },
    function (session, result) {
        session.userData.userName = result.response;
        session.send(`Hi ${session.userData.userName}! Happy to see you here.`);
        session.endDialog();
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
            if (session.userData.userName) {
                session.send(`Thank you ${session.userData.userName}, this will be useful.`);
                session.endDialog();
            }
            else {
                session.send(`Thank you, this will be useful. You might want to tell me your name aswell.`);
                session.beginDialog("askName");
            }
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
        const userName = session.userData.userName ? session.userData.userName : "";
        session.send(
            `Ok ${userName},
            I'll make a booking for ${session.privateConversationData.bookDate}
            in the name of ${session.privateConversationData.bookName}
            for ${session.privateConversationData.nbPeople} people.`
        );
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