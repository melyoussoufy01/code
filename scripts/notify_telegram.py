#!/usr/bin/env python3
import json, os, subprocess, urllib.parse, urllib.request

BOT_TOKEN=os.getenv('TELEGRAM_BOT_TOKEN','').strip()
CHAT_ID=os.getenv('TELEGRAM_CHAT_ID','').strip()
HOUSER_URL='https://melyoussoufy01.github.io/code/'

if not BOT_TOKEN:
    print('Telegram bot token missing; skipping notification.')
    raise SystemExit(0)


def discover_chat_id():
    global CHAT_ID
    if CHAT_ID:
        return CHAT_ID
    try:
        with urllib.request.urlopen(f'https://api.telegram.org/bot{BOT_TOKEN}/getUpdates',timeout=20) as r:
            data=json.loads(r.read().decode())
        for update in reversed(data.get('result',[])):
            msg=update.get('message') or update.get('channel_post') or {}
            chat=(msg.get('chat') or {})
            if chat.get('id') is not None:
                CHAT_ID=str(chat['id'])
                print('Telegram chat id auto-detected.')
                return CHAT_ID
    except Exception as e:
        print('Could not auto-detect chat id:',e)
    return ''

if not discover_chat_id():
    print('No Telegram chat found. Send /start to the bot first; skipping notification.')
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
    owner_charges=charges*0.35/12
    tax_month=tax/12
    pno_month=120/12
    cash_before_finance=rent-owner_charges-tax_month-pno_month
    effort_current=payment-cash_before_finance
    reserve_month=rent*0.03+rent*0.05
    effort_prudent=effort_current+reserve_month
    gross=rent*12/price
    factor=annuity(1,0.04,20)*0.80*1.08
    neutral_price=max(0,cash_before_finance/factor) if factor else 0
    return {'payment':payment,'effort_current':effort_current,'effort_prudent':effort_prudent,'gross':gross,'neutral_price':neutral_price}


def euro(v):
    return f"{round(v):,}".replace(',', ' ')+' €'


def send(text):
    endpoint=f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
    payload=urllib.parse.urlencode({'chat_id':CHAT_ID,'text':text,'disable_web_page_preview':'true'}).encode()
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
    actionable=metrics['effort_current']<=100
    meaningful_drop=drop>=0.03 and metrics['effort_current']<=150
    explicit=bool(x.get('telegramNotify'))
    if not ((is_new and actionable) or meaningful_drop or explicit):
        continue
    reason='Nouveau match' if is_new else (f'Baisse de prix -{drop*100:.1f} %' if drop else 'Match Houser')
    alerts.append((metrics['effort_current'],f"🏠 HOUSER — {reason}\n{x.get('city','')} · {x.get('area','')}\nPrix : {euro(price)}\nLoyer prudent : {euro(float(x.get('rentEstimateHC') or 0))} HC/mois\nMensualité Mourabaha basse : {euro(metrics['payment'])}/mois\nEffort courant : {'-' if metrics['effort_current']<0 else '+'}{euro(abs(metrics['effort_current']))}/mois\nEffort prudent : {'-' if metrics['effort_prudent']<0 else '+'}{euro(abs(metrics['effort_prudent']))}/mois\nRendement brut : {metrics['gross']*100:.1f} %\nPrix max autofinancement courant : ~{euro(metrics['neutral_price'])}\nAnnonce : {x.get('url','')}\nHouser : {HOUSER_URL}"))

for _,text in sorted(alerts,key=lambda z:z[0])[:5]:
    send(text)

print(f'{len(alerts)} Telegram alert(s) eligible.')
