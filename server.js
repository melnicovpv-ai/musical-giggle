// РОЙО — Telegram order server
// Node.js 18+
// Перед запуском создай файл .env:
//
// BOT_TOKEN=сюда_токен_бота
// CHAT_ID=сюда_твой_telegram_id
//
// Никогда не вставляй BOT_TOKEN в index.html.

const http = require("http");
const fs = require("fs");
const path = require("path");

try { require("dotenv").config(); } catch(e) {
  console.error("Установи зависимости командой: npm install");
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("Не заполнены BOT_TOKEN или CHAT_ID в .env");
  process.exit(1);
}

function sendTelegram(text) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({chat_id: CHAT_ID, text})
  }).then(async r => {
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data.description || "Telegram error");
    return data;
  });
}

function readBody(req) {
  return new Promise((resolve,reject)=>{
    let body="";
    req.on("data", chunk => body += chunk);
    req.on("end", ()=> {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Некорректные данные")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Content-Type","application/json; charset=utf-8");

  if(req.method==="POST" && req.url==="/api/order"){
    try{
      const d=await readBody(req);
      if(!d.product || !d.name || !d.contact || !d.quantity)
        throw new Error("Заполни обязательные поля");

      const text =
`🕯 НОВЫЙ ЗАКАЗ РОЙО

Свеча: ${d.product}
Количество: ${d.quantity}
Имя: ${d.name}
Контакт: ${d.contact}
Комментарий: ${d.comment || "—"}`;

      await sendTelegram(text);
      res.writeHead(200);
      res.end(JSON.stringify({ok:true}));
    }catch(e){
      res.writeHead(400);
      res.end(JSON.stringify({ok:false,error:e.message}));
    }
    return;
  }

  if(req.method==="GET" && (req.url==="/" || req.url==="/index.html")){
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.writeHead(200);
    res.end(fs.readFileSync(path.join(__dirname,"index.html")));
    return;
  }

  // Images
  if(req.method==="GET"){
    const file = path.join(__dirname, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,""));
    if(file.startsWith(__dirname) && fs.existsSync(file) && fs.statSync(file).isFile()){
      const ext=path.extname(file).toLowerCase();
      const types={".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp"};
      res.setHeader("Content-Type",types[ext]||"application/octet-stream");
      res.writeHead(200); res.end(fs.readFileSync(file)); return;
    }
  }

  res.writeHead(404); res.end(JSON.stringify({error:"Not found"}));
});

server.listen(PORT, '0.0.0.0', ()=>console.log(`РОЙО site running on port ${PORT}`));
