from pathlib import Path
import base64,hashlib,json,tarfile
root=Path(__file__).resolve().parent
manifest=json.loads((root/'SOURCE_CAPSULE_MANIFEST.json').read_text())
encoded=[]
for part in manifest['parts']:
    p=root/part['path']; data=p.read_bytes()
    if len(data)!=part['chars'] or hashlib.sha256(data).hexdigest()!=part['sha256']:
        raise SystemExit(f"source capsule part mismatch: {part['path']}")
    encoded.append(data)
archive_bytes=base64.b64decode(b''.join(encoded),validate=True)
if len(archive_bytes)!=manifest['archive_bytes'] or hashlib.sha256(archive_bytes).hexdigest()!=manifest['archive_sha256']:
    raise SystemExit('source capsule archive digest mismatch')
archive=root/manifest['archive']; archive.write_bytes(archive_bytes)
out=root/'unpacked'; out.mkdir(exist_ok=True)
with tarfile.open(archive,'r:gz') as tf:
    for member in tf.getmembers():
        target=(out/member.name).resolve()
        if out.resolve() not in target.parents and target!=out.resolve():
            raise SystemExit(f'unsafe archive path: {member.name}')
    tf.extractall(out,filter='data')
fail=[]
for e in manifest['files']:
    p=out/e['path']
    if not p.exists(): fail.append('missing:'+e['path']); continue
    b=p.read_bytes()
    if len(b)!=e['bytes'] or hashlib.sha256(b).hexdigest()!=e['sha256']: fail.append('digest:'+e['path'])
if fail: raise SystemExit('\n'.join(fail))
print(json.dumps({'status':'SOURCE_CAPSULE_VERIFIED','version':manifest['version'],'files':len(manifest['files']),'archive_sha256':manifest['archive_sha256'],'next':'cd unpacked && npm run check'},indent=2))
