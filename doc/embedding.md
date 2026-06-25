# Embedding   
Embedding is a way of vectorization of tokens (words / objects turned into numbers).   
This can be of two types:   
  1. Static [Word2Vec, GloVe]   
  2. Contextual   
Contextual Embedding, is a way of vectorization where we first represent the object (words) to their dictionary meaning, i.e. first perform static embedding (such as word2vec), but during model we change these embedding according to it's surrounding. Hence, they become contextual.   
   
See from min 5min to 10min mark   
["The cat sat on a mat"]    
→ tokenization    
→ [791, 8415, 7731, 389, 264, 5634]    
→ embedding (shallow neural network)   
   
 [[0.12, 0.819, …],   
   …   
   [0.2, 0.8, …]],   
   
Here each row represents a token, so there should be 6 rows   
![image_1779920193822_0](files/image_1779920193822_0.png)    
   
A shallow neural network of input size of the total token size and the output is the size of the total dimension (i.e. how many dimension we we want to represent the token in).   
   
![image_1779920637533_0](files/image_1779920637533_0.png)    
   
For the output of the decoder tho, this is the embedding network is opposite, so, the embedding dimension is the input and the the total token vocabulary size is the output.   
   

$$
https://youtu.be/hVM8qGRTaOA?si=JGexx4PsCpA5ZK0Y&t=890
$$
   

$$
https://www.youtube.com/watch?v=l4is4uHvKlU
$$
   
   
   
