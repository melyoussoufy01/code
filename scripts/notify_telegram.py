#!/usr/bin/env python3
import json, os, subprocess, urllib.parse, urllib.request

BOT_TOKEN=os.getenv('TELEGRAM_BOT_TOKEN','').strip()
CHAT_ID=os.getenv('TELEGRAM_CHAT_ID','').strip()
HOUSER_URL='https://melyoussoufy01.github.io/code/'

if not BOT_TOKEN:
    print('TELEGRAM_BOT_TOKEN missing; skipping notification.')
    raise SystemExit(0)


def api_get(method):
    endpoint=f'https://api.telegram.org/bot{BOT_TOKEN}/{method}'
    with urllib.request.urlopen(endpoint, timeout=20) as r:
        return json.loads(r.read().decode())


def resolve_chat_id():
    global CHAT_ID
    if CHAT_ID:
        return CHAT_ID
    try:
        data=api_get('getUpdates')
        updates=data.get('result') or []
        for upd in reversed(updates):
            msg=upd.get('message') or upd.get('edited_message') or upd.get('channel_post') or {}
            chat=msg.get('chat') or {}
            cid=chat.get('id')
            if cid is not None:
                CHAT_ID=str(cid)
                print('Telegram chat id auto-detected from latest update.')
                return CHAT_ID
    except Exception as exc:
        print(f'Unable to auto-detect Telegram chat id: {exc}')
    print('No Telegram chat found yet. Open the bot and send /start once, then rerun the workflow.')
    raise SystemExit(0)


def load_json(path):
    with open(path,encoding='utf-8') as f:
        return json.load(f)


def previous_json():
    try:
        raw=subprocess.check_output(['git','show','HEAD^:data/listings.json'],text=True)
        return json.loads(raw)
    except Exception:
        return {'listings':[]}


def annuity(principal,annual_rate,years):
    if principal<=0:return 0.0
    r=annual_rate/12
    n=years*12
    return principal*r/(1-(1+r)**(-n))


def calc(x):
    price=float(x.get('price') or 0)
    rent=float(x.get('rentEstimateHC') or 0)
    charges=float(x.get('chargesAnnual') or 0)
    tax=float(x.get('propertyTax') or 0)
    works=float(x.get('works') or 0)
    if not price or not rent:return None
    total=price*1.08+works
    financed=total*0.80
    payment=annuity(financed,0.04,20)
    net_annual=rent*12-charges*0.35-tax-rent*12*0.03-rent*12*0.05-120
    net_month=net_annual/12
    effort=payment-net_month
    gross=rent*12/price
    factor=annuity(1,0.04,20)*0.80*1.08
    neutral_price=max(0,net_month/factor) if factor else 0
    return {'payment':payment,'net_month':net_month,'effort':effort,'gross':gross,'neutral_price':neutral_price}


def euro(v):
    return f"{round(v):,}".replace(',', ' ')+' €'


def send(text):
    chat_id=resolve_chat_id()
    endpoint=f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    payload=urllib.parse.urlencode({'chat_id':chat_id,'text':text,'disable_web_page_preview':'true'}).encode()
    req=urllib.request.Request(endpoint,data=payload,method='POST')
    with urllib.request.urlopen(req,timeout=20) as r:
        print(r.read().decode())

current=load_json('data/listings.json')
prev=previous_json()
prev_by_id={x.get('id'):x for x in prev.get('listings',[]) if x.get('id')}
alerts=[]

for x in current.get('listings',[]):
    if not x.get('free') or x.get('dpe') in ('F','G') or x.get('coproStatus')=='risk':
        continue
    metrics=calc(x)
    if not metrics:continue
    old=prev_by_id.get(x.get('id'))
    is_new=old is None
    old_price=float(old.get('price') or 0) if old else 0
    price=float(x.get('price') or 0)
    drop=(old_price-price)/old_price if old_price and price<old_price else 0
    actionable=metrics['effort']<=100
    meaningful_drop=drop>=0.03 and metrics['effort']<=150
    explicit=bool(x.get('telegramNotify'))
    if not ((is_new and actionable) or meaningful_drop or explicit):
        continue
    reason='Nouveau match' if is_new else (f'Baisse de prix -{drop*100:.1f} %' if drop else 'Match Houser')
    alerts.append((metrics['effort'],f"🏠 HOUSER — {reason}\n{x.get('city','')} · {x.get('area','')}\nPrix : {euro(price)}\nLoyer prudent : {euro(float(x.get('rentEstimateHC') or 0))} HC/mois\nMensualité proxy : {euro(metrics['payment'])}/mois\nEffort estimé : {'-' if metrics['effort']<0 else '+'}{euro(abs(metrics['effort']))}/mois\nRendement brut : {metrics['gross']*100:.1f} %\nPrix max autofinancement : ~{euro(metrics['neutral_price'])}\nAnnonce : {x.get('url','')}\nHouser : {HOUSER_URL}"))

for _,text in sorted(alerts,key=lambda z:z[0])[:5]:
    send(text)

print(f'{len(alerts)} Telegram alert(s) eligible.')
