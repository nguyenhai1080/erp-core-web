"""Disposable synthetic PDFs only. Run with the bundled Python/reportlab runtime."""
from pathlib import Path
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.lib.pdfencrypt import StandardEncryption
from PIL import Image, ImageDraw, ImageFont
import sys
root=Path(sys.argv[1]); root.mkdir(parents=True,exist_ok=True)
lines=['STATEMENT CONFIRMATION ON SHARING REVENUE OF MOVTV BETWEEN',
       'MOVITEL AND DIGICOM - DISPOSABLE TEST ONLY', 'Period: Oct-2026',
       'Under the Agreement No.: LOCAL/2026/MOVTV signed on: 01/01/2026',
       'Exchange rate: 63.50', 'The Total revenue in October of DIGICOM is: 1,234.56 USD',
       '(In word: One thousand two hundred thirty four dollars)',
       'No real partner, financial transaction or approval is represented.']
def page(c):
    c.setFont('Helvetica',12)
    for i,line in enumerate(lines): c.drawString(30,790-i*32,line)
    c.showPage()
c=canvas.Canvas(str(root/'text.pdf')); page(c); c.save()
font_path=Path('C:/Windows/Fonts/arial.ttf')
font=ImageFont.truetype(str(font_path),28)
image=Image.new('RGB',(1600,2000),'white'); draw=ImageDraw.Draw(image)
for i,line in enumerate(lines): draw.text((50,100+i*85),line,fill='black',font=font)
c=canvas.Canvas(str(root/'scan.pdf'));c.drawImage(ImageReader(image),0,0,width=595,height=842);c.showPage();c.save()
c=canvas.Canvas(str(root/'mixed.pdf'));page(c);c.drawImage(ImageReader(image),0,0,width=595,height=842);c.showPage();c.save()
c=canvas.Canvas(str(root/'too-many.pdf'))
for i in range(13): page(c)
c.save()
c=canvas.Canvas(str(root/'encrypted.pdf'),encrypt=StandardEncryption('local-fixture-password'));page(c);c.save()
print('Created 5 synthetic reading fixtures')
