import importlib.util
from pathlib import Path

FILE = Path(__file__).parents[1] / 'scripts/check_prices.py'
spec = importlib.util.spec_from_file_location('prices', FILE)
prices = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prices)

HTML = '''
<html><h2>Modele (5)</h2>
<section class="product"><a href="/p/10/xfx-swift-rx-9060-xt-16gb">XFX Swift Radeon RX 9060 XT OC 16GB GDDR6</a><div>Morele i 2 inne sklepy</div><div>2\u00a0874,08 zł najtańszy</div></section>
<section class="product"><a href="/p/11/sapphire-9060xt">Sapphire Pulse Radeon RX 9060 XT 16 GB GDDR6</a><span>x-kom</span><strong>2 599 zł</strong></section>
<section class="product"><a href="/p/12/rx-9060-xt-8gb">Asus Radeon RX 9060 XT 8GB GDDR6</a><span>Morele</span><span>1 999 zł</span></section>
<section class="product"><a href="/p/13/rx-9060-xt-used">Asus RX 9060 XT 16GB Używana</a><span>Morele</span><span>1 300 zł</span></section>
<section class="product"><a href="/p/14/powercolor-9060-xt">PowerColor Reaper RX 9060 XT 16 GB</a><span>RTV Euro AGD</span><span>3 099,99 zł</span></section>
<section class="product"><a href="/p/15/no-stock">Gigabyte RX 9060 XT 16GB</a><span>brak w sklepach niedostępny</span></section>
</html>
'''

def test_parses_supported_new_cards_only():
    cards = prices.extract_offers(HTML)
    assert len(cards) == 3
    assert [c['price'] for c in cards] == [2599, 2874.08, 3099.99]
    assert cards[0]['merchant'] == 'x-kom'
    assert cards[0]['id'] == prices.model_key(cards[0]['name'])


def test_price_with_nbsp_and_comma():
    assert prices.price_number('2\u202f899,90 zł') == 2899.9
    assert prices.price_number('8 000 zł') == 8000
    assert prices.price_number('99,99 zł') is None
