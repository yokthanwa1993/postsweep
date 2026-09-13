"""Build a reproducible Chrome ZIP from an explicit list of distributable files."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
FILES = (
    'manifest.json', 'launcher.js', 'controller.js', 'facebook.js', 'model.js',
    'calendar.js', 'popup.html', 'popup.js', 'popup.css', 'start.html',
    'icons/red-white-16.png', 'icons/red-white-32.png',
    'icons/red-white-48.png', 'icons/red-white-128.png',
    'README.md', 'PRIVACY.md',
)


def build(output):
    contents = {}
    for name in FILES:
        source = ROOT / name
        if source.resolve() != source or not source.is_file():
            raise ValueError('Missing or linked distribution file: ' + name)
        contents[name] = source.read_bytes()
    manifest = json.loads(contents['manifest.json'])
    referenced = [manifest['background']['service_worker'], manifest['action']['default_popup'], manifest['options_page']]
    referenced += list(manifest['icons'].values()) + list(manifest['action']['default_icon'].values())
    if any(name not in contents for name in referenced):
        raise ValueError('The manifest references a file outside the distribution list')
    version = manifest['version']
    if not version or any(part not in '0123456789.' for part in version):
        raise ValueError('Invalid version')
    output.mkdir(parents=True, exist_ok=True)
    archive = output / ('postsweep-' + version + '.zip')
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
        for name, content in contents.items():
            info = zipfile.ZipInfo('postsweep/' + name, date_time=(2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(info, content, compresslevel=9)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.sha256').write_text(digest + '  ' + archive.name + '\n', encoding='utf-8')
    print(json.dumps({'archive': str(archive), 'version': version, 'files': len(contents), 'sha256': digest}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    build(parser.parse_args().output.resolve())
