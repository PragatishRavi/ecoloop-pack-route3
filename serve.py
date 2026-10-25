from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parent
os.chdir(ROOT)
print('EcoLoop Pack running at http://127.0.0.1:8000')
ThreadingHTTPServer(('127.0.0.1',8000),SimpleHTTPRequestHandler).serve_forever()
