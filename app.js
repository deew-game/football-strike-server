const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {'pingInterval': 3000, 'pingTimeout': 3000});

var rooms = [];
var timeout = 30; //put here a timeout as second 
var ids = 0;
app.get('/', (req, res) => { res.end("<b>Hello Deew's</b>"); });


io.on('connection', (socket) =>
{
    let us = null, me = null;
    socket.on('join', (id) =>
    {
        try
        {
            //-- check user was already playing --> so rejoin him!
            let alreadyPlaying = false;
            rooms.forEach(room =>
            {
                room['users'].forEach((user) =>
                {
                    if(user['id'] == id)
                    {
                        alreadyPlaying = true;
                        console.log('> user rejoined', socket.id, '()  -->  ', id);
                        us = room;
                        me = user;
                        
                        me['socket'] = socket;
                        me['disconnect'] = 0;
                        
                        //-- after rejoin, so we need sync user info!
                        if(us['users'].length == 2)
                        {
                            me['socket'].emit('score', us['users'][0]['score'] + ':' + us['users'][1]['score']);

                            let hits = "hits";
                            Object.keys(us['hits']).forEach((hit) =>
                            {
                                hits += ":" + hit;
                            });
                            me['socket'].emit('remake', hits);

                            let other = (us['users'][0] == me) ? us['users'][1] : us['users'][0];
                            if(other['disconnect'] == 0)
                            {
                                me['socket'].emit('timer', "0", "0");
                                other['socket'].emit('timer', "0", "0");
                            }
                            else
                            {
                                let timeToTimeout = Math.floor(timeout - ((Date.now() - other['disconnect']) / 1000));
                                me['socket'].emit('timer', "1", timeToTimeout.toString());
                            }
                        }
                    }
                });
            });


            //-- find or create some room to join... !!!
            if(!alreadyPlaying)
            {
                console.log('> user connnected', socket.id, '()  -->  ', id);
                me = {'socket' : socket, 'score' : 0, 'id' : id, 'disconnect' : 0};
                let founded = false;

                //-- look for a room with 1 user  -->  to join in room!s
                rooms.forEach(room =>
                {
                    if(room['users'].length == 1)
                    {
                        us = room;
                        us['users'].push(me);
                        us['users'][0]['socket'].emit('started', 'started!');
                        us['users'][1]['socket'].emit('started', 'started!');

                        if(us['users'][0]['disconnect'] != 0)
                        {
                            let timeToTimeout = Math.floor(timeout - ((Date.now() - us['users'][0]['disconnect']) / 1000));
                            me['socket'].emit('timer', "1", timeToTimeout.toString());
                        }
                        else
                            me['socket'].emit('timer', "0", "0");
                        founded = true;
                    }
                });

                //-- room not founded?...  so i will create one...!!!
                if(!founded)
                {
                    us = {'id' : ids, 'open' : true, 'hits' : [], 'users' : [me], '9bug' : true};
                    rooms.push(us);
                    console.log('> user', socket.id, 'created room id(', ids, ')  -->  ', id);
                    me['socket'].emit('timer', "0", "0");
                    ids++;
                }
            }

            
            //-- those 2 guys in room are ready --> let's PLAY.
            socket.on('shoot', (arg) =>
            {
                if(us['open'] && us['users'].length == 2)
                {
                    let time = Date.now();
                    if(us['hits'][arg] == undefined || (time - us['hits'][arg]) < 500)
                    {
                        //-- add score and delete hits, if shoot was valid!
                        us['hits'][arg] = time;
                        me['score'] = me['score']+1;
                        
                        us['users'].forEach((ele) =>
                        {
                            if(ele != me['socket'])
                                ele['socket'].emit('delete', arg);
                            ele['socket'].emit('score', us['users'][0]['score'] + ':' + us['users'][1]['score']);
                        });
        
                        console.log(arg, us['hits'][arg], Object.keys(us['hits']).length);


                        //-- and finally after 9 shoots --> someone lose, someone win!
                        if(Object.keys(us['hits']).length >= 9 && us['9bug'])
                        {
                            setTimeout(function ()
                            {
                                let winner = (us['users'][0]['score'] >= us['users'][1]['score']) ? us['users'][0] : us['users'][1];
                                let looser = (us['users'][0]['score'] >= us['users'][1]['score']) ? us['users'][1] : us['users'][0];

                                winner['socket'].emit('logs2', "Winner, Winner, Chicken Dinner!");
                                looser['socket'].emit('logs2', "You Lose... :(");

                                setTimeout(function ()
                                {
                                    if(us['users'][0]['socket'])
                                        us['users'][0]['socket'].emit('ended', 'ended!');
                                    if(us['users'][1]['socket'])
                                        us['users'][1]['socket'].emit('ended', 'ended!');
                                }, 5000);

                                us['open'] = false;

                                let indx = rooms.indexOf(us);
                                if (indx > -1)
                                    rooms.splice(indx, 1);
                            }, 1000);
                            us['9bug'] = false;
                        }
                    }
                }
                else
                {
                    //-- just reload gamers, cus they are bugged i guess... :(
                    if(me['socket'])
                        me['socket'].emit('logs2', "You'r room was closed!<br>we are teleporting you soon...");
    
                    setTimeout(function ()
                    {
                        if(me['socket'])
                            me['socket'].emit('ended', 'ended!');
                    }, 5000);

                    console.log('oh! looks bugged, so i reloaded gamers... :)');
                }
            });
        }
        catch(err)
        {
            console.log('> Looks like we have some error... (1)');
            console.log('> details: ' + err);
        }
    });


    //-- some logs when temp disconnecting ...
    socket.on('disconnect', () =>
    {
        if(me !=  null)
        {
            console.log('> user lagged', socket.id, '  -->  ', me['id']);
            me['disconnect'] = Date.now();

            if(us['users'].length == 2)
            {
                let other = (us['users'][0] == me) ? us['users'][1] : us['users'][0];
                if(other['disconnect'] == 0)
                    other['socket'].emit('timer', "1", timeout.toString());
            }
        }
    });
});
http.listen(7001, () => { console.log('> server started on 7001'); });


//-- check connection timeouts --> to kick their ass!
setInterval(() =>
{
    let now = Date.now();
    rooms.forEach(room =>
    {
        room['users'].forEach((user) =>
        {
            if(user['disconnect'] != 0 && (now - user['disconnect']) > 30000)
            {
                console.log('> user disconnected', user['socket'].id, '()  -->  ', user['id']);
                room['open'] = false;

                let indx = rooms.indexOf(room);
                if (indx > -1)
                    rooms.splice(indx, 1);

                //-- if other player still online --> he is a winner!
                if(room['users'].length == 2)
                {
                    let winner = (room['users'][0] == user) ? room['users'][1] : room['users'][0];
                    if(winner['disconnect'] == 0)
                        winner['socket'].emit('logs2', "You'r friend scared and run!<br>so...<br>Winner, Winner, Chicken Dinner!");

                    console.log('> user disconnected', winner['socket'].id, '()  -->  ', winner['id']);
                    setTimeout(function ()
                    {
                        if(winner['disconnect'] == 0)
                            winner['socket'].emit('ended', 'ended!');
                    }, 5000);
                }
            }
        });
    });
}, 1000);