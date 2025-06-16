const Koa = require('koa');
const fs = require('fs');
const Router = require('koa-router');
const cors = require('@koa/cors');
const staticServe = require('koa-static');
const compose = require('koa-compose');
const path = require('path');
const jsonJwt = require('jsonwebtoken');
const koaJwt = require('koa-jwt');
const clientDB = require('./redis');
const SECRECT_STRING = "Gina"
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

function configurableSetting(config) {
    return async (ctx, next) => {
        await next()
    }
}
// response time
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const timeTakes = Date.now() - start;
    ctx.set('X-Response-time', `${timeTakes}ms`);
})

app.use(staticServe(path.join(__dirname, 'public')))
app.use(configurableSetting({}));

app.use(bodyParser());

// error catch
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.type = "json"
        ctx.body = { message: err.message }
        ctx.app.emit('error', err, ctx)
    }
})

// print log
app.use(async (ctx, next) => {
    ctx.header.authorization
    console.log(`method: ${ctx.method}, url: ${ctx.url}`)
    await next();
})

app.use(async (ctx, next) => {
    if (!ctx.redis) {
        ctx.redis = clientDB
    }
    await next();
})
// cors 
app.use(cors());

//JWT token verified
app.use(koaJwt({
    secret: SECRECT_STRING,
    passthrough: ['getJwtToken'],
}).unless({
    path: [/^\/public/]
}))

const middlewareAuth = async (ctx, next) => {
    // skip specific methods
    if (ctx.header.authorization || ctx.path === '/getJwtToken') {
        await next()
    } else {
        ctx.throw(401, 'not authed.')
    }
}

const middlewareToken = async (ctx, next) => {
    if (!ctx.header.jwtToken) {
        await next()
    } else {
        ctx.throw(401, 'you don have access to system.')
    }
}
app.use(compose([middlewareAuth, middlewareToken]))

router.get('/getJwtToken', async (ctx, next) => {
    const { id } = ctx.query;
    await next();
    const token = jsonJwt.sign({ id }, SECRECT_STRING, { expiresIn: '8h' });
    ctx.body = { token };
})

router.get('/login', async (ctx, next) => {
    console.log('login start...');
    const { name, prId } = ctx.query
    await next();
    const userList = await fs.promises.readFile('./userInfo.json', 'utf8');
    const isExist = JSON.parse(userList).filter(item => item.id === +prId && name === item.name)?.[0];
    if (!isExist) {
        ctx.throw(400, 'login failed.')
    }
    ctx.body = { ...isExist }
    ctx.type = "json"
    console.log('login end...');
})

router.post('/addUser', async (ctx, next) => {
    if (ctx.method === 'POST') {
        const { id, name, isFemale } = ctx.request.body;
        const isExist = await clientDB.exists(`user_profile:${id}`);
        // 1: existing
        // 0: not existing
        // others: error
        if (isExist === 1) {
            ctx.throw(400, 'user is existing.')
        } else {
            const result = await clientDB.hSet(`user_profile:${id}`, {
                'name': name,
                'female': `${+isFemale}`,
                'male': `${+(!isFemale)}`
            });
            console.log('=====result', result)
            // 1 : add success
            // 0: updated success
            // others: error
            if (result !== 0) {
                ctx.body = {
                    data: 'add user success!'
                }
            } else {
                ctx.throw(400, 'add user fail.')
            }
        }
    }
    await next();
})

router.get('/getUserDetails', async (ctx, next) => {
    console.log('get details start...');
    await next();
    const allKeys = await clientDB.keys('*');
    const allUserList = []
    for (const item of allKeys) {
        const type = await clientDB.type(item)
        if (type === 'hash') {
            const userDetails = await clientDB.hGetAll(item);
            userDetails['female'] = !!(+userDetails['female'])
            userDetails['male'] = !!(+userDetails['male'])
            allUserList.push(userDetails)
        }
    }
    ctx.body = {
        data: allUserList
    }
})

app.use(router.routes()).use(router.allowedMethods());
app.on('error', (err, ctx) => {
    console.log('error', JSON.stringify(err));
})
app.listen(8081, () => {
    console.log('nodejs started')
})