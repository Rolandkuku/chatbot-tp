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

var bot = new builder.UniversalBot(connector, function (session, args) {
    //
});

bot.recognizer(new builder.RegExpRecognizer( "DoHeavyWorkIntent", /^doheavywork$/));
bot.dialog('HeavyWork', function (session) {
    session.sendTyping();
    var intervalId = setInterval(
        function () {
            session.sendTyping();
        },
        1000
    );
    setTimeout(
        function () {
            session.send("Heavy work done !");
            clearInterval(intervalId);
        },
        10000
    );
}).triggerAction({ matches: 'DoHeavyWorkIntent' });


bot.on('conversationUpdate', function (activity) {
    activity.membersAdded.forEach(function (member) {
        if(member.name === "User") {
            var reply = new builder.Message()
            .address(activity.address)
            .text("Yo !");
            bot.send(reply);
        }
    })
});
