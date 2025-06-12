const Koa = require('koa');
const fs = require('fs');
const Router = require('koa-router');
const cors = require('@koa/cors');
const staticServe = require('koa-static');
const path = require('path');

const app = new Koa();
const router = new Router();

function configurableSetting (config) {
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

// error catch
app.use(async (ctx, next)=>{
    try {
        await next();
    } catch(err) {
        ctx.status = err.status || 500;
        ctx.type = "json"
        ctx.body = { message: err.message }
        ctx.app.emit('error', err, ctx)
    }
})

// print log
app.use(async (ctx, next) => {
    console.log(`method: ${ctx.method}, url: ${ctx.url}`)
    await next();
})

// cors 
app.use(cors());

router.get('/login', async(ctx, next)=>{
    console.log('login start...');
    const { name, prId } = ctx.query
    await next();
    const userList = await fs.promises.readFile('./userInfo.json', 'utf8');
    const isExist = JSON.parse(userList).filter(item => item.id === +prId && name === item.name)?.[0];
    if (!isExist) {
        ctx.throw(400, 'login failed.' )
    }
    ctx.body = {...isExist}
    ctx.type = "json"
    console.log('login end...');
})

router.get('/getAllDetails', async(ctx, next) => {
    console.log('get details start...');
    await next();
    const userList = JSON.parse(await fs.promises.readFile('./userInfo.json', 'utf-8'));
    if (userList instanceof Array) {
        ctx.body = { data: userList }
    } else {
        ctx.throw(400, 'db fail')
    }
    console.log('get details end...');
})

app.use(router.routes()).use(router.allowedMethods());
app.on('error', (err, ctx)=> {
    console.log('error');
})
app.listen(8081, ()=> {
    console.log('Koa starting...')
})