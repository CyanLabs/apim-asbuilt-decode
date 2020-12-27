from flask import Flask, request, jsonify, flash, redirect, url_for
from werkzeug.utils import secure_filename
import json
import time

import os
import sys
sys.path.append('/app')

import re

# local imports
from asbuilt import AsBuilt
from encoder import print_bits_known_de07_08, ItemEncoder, print_duplicates
from statics import JumpTables, Fields

UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'xml', 'ab', 'abt'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def index():
    return 'OK'

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_file():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({
                'status': 'ERR',
                'message': 'Upload interrupted'
            })
        file = request.files['file']
        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            return jsonify({
                'status': 'ERR',
                'message': 'No file uploaded'
            })
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            return jsonify({
                'status': 'OK',
                'filename': filename
            })

    # If we end up here, go back home
    return jsonify({
        'status': 'ERR',
        'message': 'General Error'
    })

@app.route('/post-xml', methods=['POST'])
def post_xml():
    if request.method == 'POST':
        filename = secure_filename(str(int(time.time())) + '.xml')

        # Save to file
        text_file = open(os.path.join(app.config['UPLOAD_FOLDER'], filename), "w")
        text_file.write(request.form.get('xml'))
        text_file.close()

        return jsonify({
            'status': 'OK',
            'filename': filename
        })

    # If we end up here, go back home
    return jsonify({
        'status': 'ERR',
        'message': 'General Error'
    })

@app.route('/process')
def process():
    item_encoder = ItemEncoder()

    file = os.path.join(app.config['UPLOAD_FOLDER'], request.args.get('filename'))

    if os.path.isfile(file) == False:
        return jsonify({
            'status': 'ERR',
            'message': 'File not found'
        })

    asbuilt1 = AsBuilt(file)

    output = []
    for block in range(1, len(asbuilt1.blocks) + 1):
        block_section = {
            'block': block,
            'name': '',
            'values': []
        }

        result = item_encoder.format(block, asbuilt1, None)

        parsed_section = {
            'name': '',
            'values': []
        }
        for line in result.split('\n'):
            # Skip if line starts with "Block"
            line_regex = re.search("^Block ([0-9]+)", line)
            if line_regex is not None:
                block_section['name'] = line
                continue

            # Process option heading
            regex = r"^(.{80}) (.{9}) (.{12}) (.{8}) (.+)$"
            for match_num, match in enumerate(re.finditer(regex, line, re.MULTILINE), start=1):
                # print(f"Match {match_num} was found at {match.start()}-{match.end()}: {match.group(1)}")
                if match.group(1)[0] == '#': continue
                if parsed_section['name']: block_section['values'].append(parsed_section)
                parsed_section = {
                    'name': match.group(1).replace('.', '').replace(': ', ''),
                    'values': []
                }
                continue

            # Process option values
            regex = r"^(.{11})([0-9]+):\s(.*?)$"
            for match_num, match in enumerate(re.finditer(regex, line, re.MULTILINE), start=1):
                # print(f"Match {match_num} was found at {match.start()}-{match.end()}: {match.group(1)}")
                selected = False
                if match.group(1).strip() == '>>':
                    selected = True
                parsed_section['values'].append({
                    'selected': selected,
                    'code': match.group(2),
                    'text': match.group(3)
                })

        output.append(block_section)

    return jsonify({
        'status': 'OK',
        'data': output
    })

if __name__ == '__main__':
    app.run(
        debug=True,
        host='0.0.0.0',
        port=8001
    )
