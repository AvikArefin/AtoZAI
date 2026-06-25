# Noise & Filters   
# Noise Models   
1. Spatial   
2. Frequency   
   
   
   
# Noise Probablility denstity function:   
   
1. Gausian Noise   
2. Reyleigh Noise   
3. Gama Noise   
4. Exponential Noise   
5. Uniform Noise   
6. Impulse (Salt / Papper) Noise   
   
   
Gausian and Reyleigh Noise Equations respectively   
![image](files/image_c.png)    
   
## Periodic Noise   
Electrical mechanical interface during acquisition   
can be removed by frequency domain analysis   
   
Estimation of noise parameter   
# Spatial Filtering   

$$
g(x, y) = f(x,y) + q(x, y)
$$
   

$$
G(u, v) = f(u,v) + N(u, v)
$$
   
Noisy Image = Original image + Noise   
Mean Filter    
→ Arithmatic mean filter   
  ![image](files/image_r.png)    
→ Geometric mean filter   
  ![image](files/image_a.png)    
→ Harmonic mean filter (for pure white salt)   
  ![image](files/image_15.png)    
→ Contraharmonic mean filter (works for both types of salt and pepper noise)   
  ![image](files/image_d.png)    
   
   
# Order Statics Filter   
→ Median Filter (works great for biploar and … )   
  ![image](files/image_j.png)    
→ Max min fitler   
  ![image](files/image_1t.png)    
→ Midpoint filter   
  ![image](files/image.png)    
→ Alpha trimmed mean filter   
  ![image](files/image_o.png)    
   
# Adaptive Filter   
→ Local Noise Reduction   
  ![image](files/image_e.png)    
→ Median Filter   
  See the algorithm given in book   
