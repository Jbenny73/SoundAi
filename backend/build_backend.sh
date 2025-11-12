#!/usr/bin/env bash
pip install -r requirements.txt pyinstaller
pyinstaller -F app/main.py -n soundai_backend
# output in dist/soundai_backend

