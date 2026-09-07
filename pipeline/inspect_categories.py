import lxml.html
from pathlib import Path

html_file = Path(r'C:\Users\amrit\.gemini\antigravity-ide\brain\3a82990c-d5cb-470c-846d-e0249590d6ca\.system_generated\steps\72\content.md')
raw_text = html_file.read_text(encoding='utf-8')
tree = lxml.html.fromstring(raw_text)

h2_elements = tree.xpath('//h2')
print(f'Total H2 sections: {len(h2_elements)}')

for h2 in h2_elements:
    h2_name = h2.text_content().strip()
    parent = h2.getparent()
    links = parent.xpath('.//a[contains(@href, "/categories/")]')
    print(f'Section: {h2_name} -> {len(links)} links')
    for l in links[:3]:
        text = l.text_content().strip()
        href = l.get('href')
        if text:
            print(f'   - {text} : {href}')
