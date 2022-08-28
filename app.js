const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {'pingInterval': 25000, 'pingTimeout': 25000});

var users = [], hitPoints = [];
app.get('/', (req, res) => { res.end("<b>Hello Deew's</b>"); });

io.on('connection', (socket) =>
{
    try
    {
        var address = socket.request.connection.remoteAddress;
        console.log('> user connected', socket.id, '(', users.length+1, ')', address);
        let me = {'socket' : socket, 'score' : 0, 'ip' : address};
        let canBeAdded = true;
        users.forEach((ele) =>
            {
                if(ele['ip'] == me['ip'])
                {
                    //canBeAdded = false;
                    //ele['socket'].disconnect();
                    //me['socket'].disconnect();
                    
                    ele['socket'].emit('logs2', "You're Kicked! someone with same ip conectet!");
                    //ele['socket'].disconnect();
                    var inde = users.indexOf(ele);
                    if (inde > -1) users.splice(inde, 1);
                }
            });

        if(users.length < 2 && canBeAdded)
        {
            users.push(me);
            socket.on('shoot', (arg) =>
            {
                if(users.length == 2)
                {
                    let time = Date.now();
                    if(hitPoints[arg] == undefined || (time - hitPoints[arg]) < 500)
                    {
                        hitPoints[arg] = time;
                        me['score'] = me['score']+1;
                        
                        users.forEach((ele) =>
                        {
                            if(ele != me)
                                ele['socket'].emit('delete', arg);
                            ele['socket'].emit('score', users[0]['score'] + ':' + users[1]['score']);
                        });
        
                        console.log(arg, hitPoints[arg], Object.keys(hitPoints).length);

                        if(Object.keys(hitPoints).length >= 9)
                        {
                            var winner = (users[0]['score'] > users[1]['score']) ? users[0] : users[1];
                            var looser = (users[0]['score'] > users[1]['score']) ? users[1] : users[0];

                            winner['socket'].emit('logs2', "Winner, Winner, Chicken Dinner!");
                            looser['socket'].emit('logs2', "You Lose... :(");

                            setTimeout(function ()
                            {
                                if(users[1]['socket'])
                                    users[1]['socket'].disconnect();
                            }, 5000);
                        }
                    }
                }
                else
                {
                    console.log('oh! looks bugged, so i reloaded gamers... :)');
                    if(users[0]['socket'])
                        users[0]['socket'].disconnect();
                }
            });
            
            if(users.length == 2)
                users.forEach((ele) =>
                {
                    ele['socket'].emit('started', 'started!');
                });
        }
        else
        {
            socket.emit('logs', "Error: on demo version we only support 2 members!");
            socket.disconnect();
        }
    
        socket.on('disconnect', () =>
        {
            console.log('> user disconnected', socket.id, '(', users.length-1, ')');
            var index = users.indexOf(me);
            if (index > -1)
                users.splice(index, 1);
    
            if(users.length == 1)
            {
                hitPoints = [];

                if(users[0]['socket'])
                    users[0]['socket'].disconnect();
                //users.splice(0, 1);
                //users[0]['socket'].emit('ended', 'ended!');
            }
    
            if(users.length == 0)
                hitPoints = [];
        });
    }
    catch(err)
    {
        console.log('> Looks like we have some error...');
        console.log('> details: ' + err);
    }
});
http.listen(7001, () => { console.log('> server started on 7001'); });
