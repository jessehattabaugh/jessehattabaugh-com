oninstall = (ev) => console.info('sw installed');
onactivate = (ev) => console.log('sw activated');
onfetch = (ev) => console.info("sw fetched");
onmessage = (ev) => console.log('sw message', ev);
onnotificationclick = (ev) => console.log('sw notification click', ev);
onnotificationclose = (ev) => console.log('sw notification close', ev);
onpush = (ev) => console.log('sw push:', ev);
onpushsubscriptionchange = (ev) => console.log('sw push subscription change', ev);

console.info('sw evaluated');