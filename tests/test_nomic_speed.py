import time
from nomic import embed

print('First call...')
start = time.time()
embed.text(texts=['Hello'], model='nomic-embed-text-v1.5', inference_mode='local')
print(f'First call took {time.time() - start:.2f}s')

print('Second call...')
start = time.time()
embed.text(texts=['World'], model='nomic-embed-text-v1.5', inference_mode='local')
print(f'Second call took {time.time() - start:.2f}s')
