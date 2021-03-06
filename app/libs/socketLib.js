/**
 * modules dependencies.
 */
const socketio = require('socket.io');
const shortid = require('shortid');
const mongoose = require('mongoose');

const tokenLib = require("./tokenLib.js");

const redisLib = require("./redisLib.js");

const ChatModel = mongoose.model('Chat');
const events = require('events');
const eventEmitter = new events.EventEmitter();



let setServer = (server) => {

    let io = socketio.listen(server);

    let myIo = io.of('/')

    myIo.on('connection', (socket) => {

        console.log("on connection--emitting verify user");

        socket.emit("verifyUser", "");

        // code to verify the user and make him online

        socket.on('set-user', (authToken) => {

                console.log("set-user called")
                tokenLib.verifyClaimWithoutSecret(authToken, (err, user) => {
                    if (err) {
                        socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' })
                    } else {

                        console.log("user is verified..setting details");
                        let currentUser = user.data;
                        // setting socket user id 
                        socket.userId = currentUser.userId
                        let fullName = `${currentUser.userName}`
                        let key = currentUser.userId
                        let value = fullName

                        let setUserOnline = redisLib.setANewOnlineUserInHash("onlineUsersList", key, value, (err, result) => {
                            if (err) {
                                console.log(`some error occurred`)
                            } else {
                                // getting online users list.

                                redisLib.getAllUsersInAHash('onlineUsersList', (err, result) => {
                                    console.log(`--- inside getAllUsersInAHas function ---`)
                                    if (err) {
                                        console.log(err)
                                    } else {

                                        //console.log(`${fullName} is online`);

                                        //socket.to(socket.room).broadcast.emit('online-user-list', result);

                                        //socket.broadcast.emit('online-user-list', result);
                                        myIo.emit('online-user-list', result);
                                        console.log(result);
                                    }
                                })
                            }
                        })

                    }
                })

            }) // end of listening set-user event

        socket.on('chat-msg', (data) => {
            data['chatId'] = shortid.generate()
            console.log(data.receiverId  + "sent to " + data.receiverName );
            socket.broadcast.emit(`${data.receiverId}`, data)
            setTimeout(function () {
                eventEmitter.emit('save-chat', data);
            }, 1000)
        })

        // saving chats to database.
eventEmitter.on('save-chat', (data) => {

    // let today = Date.now();

    let newChat = new ChatModel({

        chatId: data.chatId,
        senderName: data.senderName,
        senderId: data.senderId,
        receiverName: data.receiverName || '',
        receiverId: data.receiverId || '',
        message: data.message,
        createdOn: data.createdOn

    });

    newChat.save((err, result) => {
        if (err) {
            console.log(`error occurred: ${err}`);
        }
        else if (result == undefined || result == null || result == "") {
            console.log("Chat Is Not Saved.");
        }
        else {
            console.log("Chat Saved.");
           // console.log(result);
        }
    });

}); // end of saving chat.


        socket.on('disconnect', () => {
                // disconnect the user from socket
                // remove the user from online list
                // unsubscribe the user from his own channel

                console.log("user is disconnected");

                if (socket.userId) {
                    redisLib.deleteUserFromHash('onlineUsersList', socket.userId)
                    redisLib.getAllUsersInAHash('onlineUsersList', (err, result) => {
                        if (err) {
                            console.log(err)
                        } else {
                            socket.broadcast.emit('online-user-list', result);
                        }
                    })
                }

            }) // end of on disconnect


        socket.on('notify-updates', (data) => {
            console.log("socket notify-updates called")
            console.log(data);
            socket.broadcast.emit(data.userId, data);
        });

    });
}

module.exports = {
    setServer: setServer
}