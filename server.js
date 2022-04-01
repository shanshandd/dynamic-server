let http = require('http');
let url = require('url');
let port = process.argv[2];
let fs = require('fs');

if (!port) {
    console.log('请指定端口号');
    process.exit(1);
}
let server = http.createServer(function (req, res) {
    let params = url.parse(req.url, true)
    let pathWithQuery = req.url
    console.log(params)
    let path = params.pathname
    let query = params.query
    let method = req.method
    console.log('有请求发送过来了！路径是' + pathWithQuery)

    if(path === '/'){
        path = '/index.html'
    }
    let suffix = path.substring(path.lastIndexOf('.')+1)
    let contentMap = {
        'html':'text/html',
        'js':'text/javascript',
        'css':'text/css',
        'json':'application/json',
        'xml':'text/xml',
        'png':'image/png',
        'jpg':'image/jpeg',
        'gif':'image/gif'
    }
    res.setHeader('Content-Type', `${contentMap[suffix] || 'text/html' } ;charset=utf-8`)
    if(path === '/index.html'){
        let c = req.headers.cookie;
        let currentSId;
        try{
            currentSId = c.split(';').filter((i)=>{return i.indexOf('sessionId=')>=0})[0].split('=')[1]
        }catch(err){

        }
        let string = fs.readFileSync('public/index.html').toString();

        let fileData = fs.readFileSync('public/user.json').toString() || '[]';
        let fileArr = JSON.parse(fileData);
        let sessionData = fs.readFileSync('session.json').toString() || '[]';
        let sessionArr = JSON.parse(sessionData);
        let currentUserId;
        try{
            currentUserId = (sessionArr[currentSId])['userId'];
        }catch(err){}
        let user = fileArr.find((item)=>{
            return item.id ===  Number(currentUserId)
        })
        if(!!user){
            string = string.replace('{{loginStatus}}','已登录')
             .replace('{{userName}}',user.userName);
            
        }else{
            string = string.replace('{{loginStatus}}','未登录<button>登录</button>')
             .replace( '{{userName}}' , '' );
        }
        res.write(string)
        res.end()
    }else if(path === '/register' && method === 'POST'){
        let fileData = fs.readFileSync('public/user.json').toString() || '[]';
        let fileArr = JSON.parse(fileData);

        let lastId = fileArr.length === 0 ? 'none' : fileArr.slice(-1)[0].id

        let arr = []
        req.on("data", postDataChunk=>{
            arr.push(postDataChunk);
        })
        req.on("end", ()=>{
            const string = Buffer.concat(arr)
            const obj = JSON.parse(string);
            obj.id = lastId !== 'none' ? (Number(lastId)+1): 0;
            fileArr = fileArr.concat(obj)
            fs.writeFileSync('public/user.json',JSON.stringify(fileArr))
            res.statusCode = 200
            res.end()
        })
    }else if(path === '/sign_in' && method === 'POST'){
        let fileData = fs.readFileSync('public/user.json').toString() || '[]';
        let fileArr = JSON.parse(fileData);
        let arr = [];
        // 接收post数据
        req.on("data", postDataChunk=>{
            arr.push(postDataChunk);
        })
        req.on("end", ()=>{
            const string = Buffer.concat(arr)
            const obj = JSON.parse(string);
            let  user;
            // 在文件数据中查找post的数据是否存在
            user = fileArr.find((item)=>{
                return item.userName === obj.userName && item.password === obj.password
            })
            if(user){
                res.statusCode = 200
                let randomStr = (Math.random()).toString();
                res.setHeader('Set-Cookie',`sessionId=${randomStr}; HttpOnly`)
                let session = fs.readFileSync('session.json').toString() || '{}';

                sessionObj = JSON.parse(session)
                sessionObj[randomStr] = {"userId":user.id}
                fs.writeFileSync('session.json',JSON.stringify(sessionObj))
                res.write('1')
                res.end()
            }else{
                res.statusCode = 404
                res.write('0')
                res.end()
            }
            
        })
    }else{
    
        res.statusCode = 200
        let content;
        try{
            content = fs.readFileSync(`public${path}`)
        }catch(error){
            res.statusCode = 404
            content = '文件不存在'
        }
        res.write(content)
        res.end()
    }
})

server.listen(port)
console.log('监听' + port + '成功\n请打开http://localhost:' + port)