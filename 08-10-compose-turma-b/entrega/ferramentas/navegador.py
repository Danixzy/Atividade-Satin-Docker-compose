"""Drives headless Firefox through geckodriver (plain WebDriver HTTP, stdlib only).

Usage:
  navegador.py captura <png>                 open the portal and take a screenshot
  navegador.py reserva <png> <livroId> <nome> fill the form, submit, then screenshot
"""
import base64
import json
import subprocess
import sys
import time
import urllib.request

PORTAL = 'http://localhost:8081/'
DRIVER = 'http://127.0.0.1:4444'


def chamar(metodo, caminho, corpo=None):
    dados = None if corpo is None else json.dumps(corpo).encode()
    pedido = urllib.request.Request(DRIVER + caminho, data=dados, method=metodo,
                                    headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(pedido, timeout=60) as resposta:
        return json.loads(resposta.read())['value']


def esperar_texto(sessao, seletor, condicao, limite=15):
    fim = time.time() + limite
    while time.time() < fim:
        texto = chamar('POST', f'/session/{sessao}/execute/sync', {
            'script': 'return document.querySelector(arguments[0]).innerText', 'args': [seletor]})
        if condicao(texto):
            return texto
        time.sleep(0.3)
    raise RuntimeError(f'timeout esperando {seletor}: {texto!r}')


def main():
    acao, png = sys.argv[1], sys.argv[2]
    driver = subprocess.Popen(['geckodriver', '--port', '4444'],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(50):
            try:
                chamar('GET', '/status')
                break
            except OSError:
                time.sleep(0.2)
        sessao = chamar('POST', '/session', {'capabilities': {'alwaysMatch': {
            'moz:firefoxOptions': {'args': ['-headless', '--width=1000', '--height=1000']}}}})['sessionId']
        try:
            chamar('POST', f'/session/{sessao}/url', {'url': PORTAL})
            esperar_texto(sessao, '#livros', lambda t: 'Restantes' in t or 'Falha' in t)
            esperar_texto(sessao, '#reservas', lambda t: t != 'consultando')
            if acao == 'reserva':
                livro_id, nome = sys.argv[3], sys.argv[4]
                chamar('POST', f'/session/{sessao}/execute/sync', {
                    'script': 'document.querySelector("#livro").value = arguments[0]', 'args': [livro_id]})
                campo = chamar('POST', f'/session/{sessao}/element',
                               {'using': 'css selector', 'value': '#nome'})
                ref = next(iter(campo.values()))
                chamar('POST', f'/session/{sessao}/element/{ref}/value', {'text': nome})
                botao = chamar('POST', f'/session/{sessao}/element',
                               {'using': 'css selector', 'value': '#form button'})
                chamar('POST', f'/session/{sessao}/element/{next(iter(botao.values()))}/click', {})
                esperar_texto(sessao, '#resultado', lambda t: t != '')
                esperar_texto(sessao, '#reservas', lambda t: nome in t)
                time.sleep(0.5)
            imagem = chamar('GET', f'/session/{sessao}/screenshot')
            with open(png, 'wb') as arquivo:
                arquivo.write(base64.b64decode(imagem))
            for seletor in ('#saude', '#livros', '#resultado', '#reservas'):
                print(f'{seletor}: {chamar("POST", f"/session/{sessao}/execute/sync", {"script": "return document.querySelector(arguments[0]).innerText", "args": [seletor]})}')
        finally:
            chamar('DELETE', f'/session/{sessao}')
    finally:
        driver.terminate()


if __name__ == '__main__':
    main()
