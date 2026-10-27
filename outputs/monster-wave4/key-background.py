import numpy as np

def clear_key_magenta(rgb,mask):
 # All 50 original opaque portraits were checked: this saturated key hue is absent.
 # Mild magenta reflections on armor remain below this narrow threshold.
 delta=np.minimum(rgb[:,:,0].astype(float),rgb[:,:,2])-rgb[:,:,1]
 strength=np.clip((delta-65)/35,0,1)*np.clip((100-rgb[:,:,1].astype(float))/50,0,1)
 return np.minimum(mask,255*(1-strength)).astype('uint8')
