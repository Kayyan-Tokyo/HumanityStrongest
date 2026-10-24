"""1208.pngの人物を透過のまま共通足元へ配置する開発用スクリプト。"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import label,binary_dilation
rgba=np.array(Image.open(sys.argv[1]).convert('RGBA'));labels,_=label(rgba[:,:,3]>0)
sheet=Image.new('RGBA',(3072,544))
for i,(component,anchor,foot) in enumerate([(591,251,648),(604,757,648),(594,1364,642),(598,1917,648)]):
    mask=binary_dilation(labels==component,iterations=2);mask[foot:,:]=False
    pixels=rgba.copy();pixels[~mask]=0
    cell=Image.new('RGBA',(768,544));cell.paste(Image.fromarray(pixels),(320-anchor,516-foot));sheet.paste(cell,(i*768,0))
sheet.save(Path('assets/characters/sumo_hit_4f.png'),optimize=True)
