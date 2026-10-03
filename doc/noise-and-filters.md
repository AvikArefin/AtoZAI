# Noise & Filters   
# Noise Models   
1. Spatial   
2. Frequency   
   
   
# Noise Probability Density Functions   
   
1. Gaussian Noise   
2. Rayleigh Noise   
3. Gamma Noise   
4. Exponential Noise   
5. Uniform Noise   
6. Impulse (Salt / Pepper) Noise   
   
Gaussian and Rayleigh Noise Equations   

## Periodic Noise   
Electrical/mechanical interference during acquisition   
Can be removed by frequency domain analysis   
   
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
- Arithmetic mean filter   
- Geometric mean filter   
- Harmonic mean filter (for pure white salt)   
- Contraharmonic mean filter (works for both types of salt and pepper noise)   
   
   
# Order Statistics Filters   
- Median Filter (works great for bipolar noise)   
- Max/Min filter   
- Midpoint filter   
- Alpha-trimmed mean filter   
   
# Adaptive Filters   
- Local Noise Reduction   
- Median Filter (see algorithm in textbook)   
