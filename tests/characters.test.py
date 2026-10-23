"""提供CSVと実際に読み込まれるJSデータ全30人・全項目を照合する。標準ライブラリのみ。"""
import csv
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'data/HumanityStrongest_characters_v1.csv'
fields = ['id', 'name', 'age', 'height', 'weight', 'STR', 'SPD', 'END', 'STK', 'GRP', 'SUB']
with source.open(encoding='utf-8-sig', newline='') as stream:
    reader = csv.DictReader(stream)
    assert reader.fieldnames == fields, 'CSVヘッダーが一致する'
    rows = list(reader)
assert len(rows) == 30, '30人である'
assert len({row['id'] for row in rows}) == 30, 'IDが一意である'
expected = []
for row in rows:
    assert set(row) == set(fields) and all(row.values()), '余分な列や空欄がない'
    expected.append({
        'id': row['id'], 'name': row['name'],
        **{key: int(row[key]) for key in fields[2:5]},
        'stats': {key: int(row[key]) for key in fields[5:]},
    })
script = """
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync('js/characters.js', 'utf8'), context);
process.stdout.write(JSON.stringify(context.window.CHARACTERS));
"""
actual = json.loads(subprocess.check_output(['node', '-e', script], cwd=root, text=True))
assert len(actual) == 30, 'JSも30人である'
for index, (given, character) in enumerate(zip(expected, actual), start=1):
    assert character == given, f'{index}人目がCSVと一致する: {given["id"]}'
    assert set(character) == {'id', 'name', 'age', 'height', 'weight', 'stats'}
    assert all(type(character[key]) is int for key in fields[2:5])
    assert set(character['stats']) == set(fields[5:])
    assert all(type(value) is int for value in character['stats'].values())
print('PASS: 正式CSV全30人・全11項目・並び順・型がjs/characters.jsと完全一致')
