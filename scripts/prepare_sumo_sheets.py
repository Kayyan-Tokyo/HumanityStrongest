"""添付2枚を機械的に透過・配置する開発用処理。Pillow/numpy/scipyが必要。"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes, binary_dilation
walk_path, slap_path = sys.argv[1:3]
out=Path('assets/characters');out.mkdir(exist_ok=True)
rgb=np.array(Image.open(walk_path).convert('RGB'));color=rgb.astype(int)
background=(color.max(2)-color.min(2)<36)&(color.min(2)>62)
labels,_=label(~background)
walk=Image.new('RGBA',(1280,336))
for i,(component,anchor,foot) in enumerate([(2,167,395),(1,510,394),(3,815,395),(4,1140,397)]):
    mask=binary_fill_holes(labels==component)
    rgba=np.dstack([rgb,mask.astype('uint8')*255]);rgba[~mask]=0
    cell=Image.new('RGBA',(320,336));cell.paste(Image.fromarray(rgba),(160-anchor,316-foot));walk.paste(cell,(320*i,0))
walk.save(out/'sumo_walk_4f.png',optimize=True)
rgba=np.array(Image.open(slap_path).convert('RGBA'));labels,_=label(rgba[:,:,3]>0)
slap=Image.new('RGBA',(2816,496))
for i,(component,anchor,foot) in enumerate([(89,228,667),(86,760,668),(87,1272,668),(88,1936,668)]):
    mask=binary_dilation(labels==component,iterations=2)
    mask[foot:,:]=False
    pixels=rgba.copy();pixels[~mask]=0
    cell=Image.new('RGBA',(704,496));cell.paste(Image.fromarray(pixels),(256-anchor,476-foot));slap.paste(cell,(704*i,0))
slap.save(out/'sumo_slap_4f.png',optimize=True)
