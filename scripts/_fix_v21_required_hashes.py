from pathlib import Path

path = Path('deployment/vercel-source-bridge/api/proxy.js')
text = path.read_text()
replacements = {
    "960591eddf993906100a31f910a066acfade3e17fbb1a6a3ab8a5310ae1bbfd7": "983f6948db7e332d511baee3e2a1ab1dc06e38e9948d6bd0c0edcab9fcd44226",
    "0b956afa686604796ba983992768a85e67f442364e630471f5a2d1654d7f3cc1": "d7b527b37ac9337c9187b4d9428c47fdc1a00b2a187a6a1555984892fc1e8395",
    "ee1b8d8cd5fe36d1e04e83667bf7ff8f463a89b8e057b340430b203f1ee189cd": "598f8b562a98d1b515e478b8f0ab547d1d1cd0cdbc92621c0c5ff340b66ce685",
    "c2eb82d6d612a1b0272ee0593d4624b916eb6cc8d305d93b78f2ca2d9f9707e2": "f16d1b71582d8907e0de00dc46663982c0901c6891488334200c69ea666e67f0",
    "04ae02c47333db08d533377a23b6250077ee1168ec79af539d104f844964f009": "fec7461b0a2eeeed1d8bee2822995c3440557e9ceb1746b69bc1890854ece4ec",
}
for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'expected one integrity pin {old}, found {count}')
    text = text.replace(old, new, 1)
path.write_text(text)
