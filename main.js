
const koa = require("koa")
const Router = require("koa-router")
const router = new Router()
const koaStatic  = require('koa-static')
const cors = require('@koa/cors')
const bodyParser = require('koa-bodyparser')
const fs = require("fs")
const puppeteer = require('puppeteer');
const path =require("path")

const app = new koa()

app.use(bodyParser());

const _toString = Object.prototype.toString;

// 生成随机长度的随机字符串字符
const getFileName = function (length) {
    const data =
        ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F",
            "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y",
            "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r",
            "s", "t", "u", "v", "w", "x", "y", "z"];
    let nums = "";
    for (let i = 0; i < length; i++) {
        const r = parseInt(Math.random() * 61, 10);
        nums += data[r];
    }
    return nums;
}

// 是否为一个对象
function isPlainObject(obj) {
    return _toString.call(obj) === '[object Object]'
}

// 将对象拼接成query字符串
function query(params = {}){
    if(!isPlainObject(params)){
        console.error(`query，但是得到的是${toRawType(params)}`)
        return
    }

    let str = ''
    for (let key of Object.keys(params)) {
        !str ? str+= `?${key}=` : str+= `&${key}=`
        str +=  params[key]
    }

    return str;
}


const bassUrl = process.env.NODE_ENV === 'production' ? 'https://api.petyun.net/bill' :  'http://localhost:8090/'



app.use(cors());

app.use(koaStatic(path.join('./public/')))


router.get("/home",(ctx)=>{
    ctx.body = "主页"
})

const createBrowser = async function ({ctx,type = 'png'}){
    const str = query(ctx.query)
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {
            width: 1980,
            height: 920,
        }
    }).catch(e=>{
        console.log(e);
    });

    const page = await browser.newPage();
    // 等待页面彻底加载完成
    await page.goto('http://localhost:8090/jianSan.html');
    // await page.goto(bassUrl+str);

    // 修改浏览器窗口为页面实际大小
    const elDom = await page.$eval('html',(el)=>{
        return {
            width: el.offsetWidth,
            height: el.offsetHeight
        }
    })

    await page.setViewport({
        width: elDom.width,
        height: elDom.height
    });

    let filePath = ''
    // 生成文件名
    const fileName = new Date().getTime().toString() + '-'+ getFileName(10) + '-' + (ctx.query.userName || '匿名')
    switch (type) {
        case "png":
            filePath = `public/image/${fileName}.png`
            await page.screenshot({path: filePath});
            break
        case "pdf":
            filePath = `public/pdfs/${fileName}.pdf`
            await page.pdf({path: filePath})
            break
    }

    // 关闭浏览器
    await browser.close();
    // 实际访问不自带 public目录
    filePath = filePath.replace('public/','')
    return {filePath,fileName}
}

router.get("/poster/create",async (ctx) => {
    const {filePath,fileName} = await createBrowser({ctx,type:'png'})
    ctx.body = {
        code: 200,
        data: bassUrl+filePath,
        imgName: fileName+'.png',
        msg: '成功'
    }
})

router.get("/pdf/create",async (ctx) => {
    const {filePath,v} = await createBrowser({ctx,type:'pdf'})
    ctx.body = {
        code: 200,
        data: bassUrl+filePath,
        imgName: fileName+'.pdf',
        msg: '成功'
    }
})

router.post("/poster/del",(ctx)=>{
    const imgName = ctx.request.body && ctx.request.body.imgName
    if(imgName){
        fs.unlinkSync(`public/image/${imgName}`)
    }

    ctx.body = {
        code: 200,
        msg: '删除成功'
    }
})

app.use(router.routes())

app.listen(8090)

