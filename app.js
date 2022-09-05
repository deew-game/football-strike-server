const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {'pingInterval': 3000, 'pingTimeout': 3000});

var rooms = [];
var ids = 0;
app.get('/', (req, res) => { res.end("<b>Hello Deew's</b>"); });



io.on('connection', (socket) =>
{
    us = null, me = null;
    socket.on('join', (id) =>
    {
        console.log('> user connected', socket.id, '()  -->  ', id);
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
                        us = room;
                        me = user;
                        
                        me['socket'] = socket;
                        me['disconnect'] = 0;
                        
                        if(us['users'].length == 2)
                        {
                            me['socket'].emit('score', us['users'][0]['score'] + ':' + us['users'][1]['score']);
                            me['socket'].emit('remake', Object.keys(us['hits']));

                            let other = (room['users'][0] == me) ? room['users'][1] : room['users'][0];
                            other['socket'].emit('timer', "0");
                        }
                    }
                });
            });


            //-- find or create some room to join... !!!
            if(!alreadyPlaying)
            {
                me = {'socket' : socket, 'score' : 0, 'id' : id, 'disconnect' : 0};
                let founded = false;
                rooms.forEach(room =>
                {
                    if(room['users'].length == 1)
                    {
                        us = room;
                        room['users'].push(me);
                        room['users'][0]['socket'].emit('started', 'started!');
                        room['users'][1]['socket'].emit('started', 'started!');
                        founded = true;
                    }
                });

                if(!founded)
                {
                    us = {'id' : ids, 'open' : true, 'users' : [me]};
                    rooms.push(us);
                    console.log('> user', socket.id, 'created room id(', ids, ')  -->  ', id);
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
                        us['hits'][arg] = time;
                        me['score'] = me['score']+1;
                        
                        us['users'].forEach((ele) =>
                        {
                            if(ele != me['socket'])
                                ele['socket'].emit('delete', arg);
                            ele['socket'].emit('score', us['users'][0]['score'] + ':' + us['users'][1]['score']);
                        });
        
                        console.log(arg, us['hits'][arg], Object.keys(us['hits']).length);

                        if(Object.keys(us['hits']).length >= 9)
                        {
                            let winner = (us['users'][0]['score'] > us['users'][1]['score']) ? us['users'][0] : us['users'][1];
                            let looser = (us['users'][0]['score'] > us['users'][1]['score']) ? us['users'][1] : us['users'][0];

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

                            let indx = rooms.indexOf(room);
                            if (indx > -1)
                                rooms.splice(indx, 1);
                        }
                    }
                }
                else
                {
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


    //-- log when temp disconnecting ...
    socket.on('disconnect', () =>
    {
        if(me !=  null)
        {
            console.log('> user lagged', socket.id, '  -->  ', me['id']);
            me['disconnect'] = Date.now();

            if(us['users'].length == 2)
            {
                let other = (room['users'][0] == me) ? room['users'][1] : room['users'][0];
                other['socket'].emit('timer', "1");
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

                if(room['users'].length == 2)
                {
                    let winner = (room['users'][0] == user) ? room['users'][1] : room['users'][0];
                    winner.emit('logs2', "You'r friend scared and run!<br>So<br>Winner, Winner, Chicken Dinner!");

                    setTimeout(function ()
                    {
                        if(winner['socket'])
                            winner['socket'].emit('ended', 'ended!');
                    }, 5000);
                }
            }
        });
    });
}, 1000);