"""添付1207.pngを再描画せず透明セルへ配置する開発用処理。"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label,binary_dilation
rgba=np.array(Image.open(sys.argv[1]).convert('RGBA'));labels,_=label(rgba[:,:,3]>0)
sheet=Image.new('RGBA',(2560,544))
for i,(component,anchor,foot) in enumerate([(77,275,633),(70,870,633),(103,1350,630),(79,1906,633)]):
    mask=binary_dilation(labels==component,iterations=2);mask[foot:,:]=False
    pixels=rgba.copy();pixels[~mask]=0
    cell=Image.new('RGBA',(640,544));cell.paste(Image.fromarray(pixels),(320-anchor,516-foot));sheet.paste(cell,(i*640,0))
out=Path('assets/characters/spartan_hit_4f.png');sheet.save(out,optimize=True)
