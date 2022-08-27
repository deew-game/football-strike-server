const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {'pingInterval': 25000, 'pingTimeout': 25000});

var users = [], hitPoints = [];
app.get('/', (req, res) => { res.end("<b>Hello Deew's</b>"); });

io.on('connection', (socket) =>
{
    try
    {
        console.log('> user connected', socket.id, '(', users.length+1, ')');
        let me = {'socket' : socket, 'score' : 0};

        if(users.length < 2)
        {
            users.push(me);
            socket.on('shoot', (arg) =>
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
