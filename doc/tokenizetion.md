# Tokenizetion   
Now we start ROAD TO TRANSFORMERS.   
Tokenization is a simple process of simply turning words into one shot numbers. Yes, no vectorization, no extra processing, it is simply **the process of chunking together "sections"** into and turning them into tokens.   
   
Example:   
"I am crimson" → [1239, 83, 1347] ("I", " am", " crimson")   
or even    
"I am crimson" → [1239, 83, 124, 27] ("I", " am", " crim", "son")   
   
Before we learn about tokenization, we should understand the importance of it:   
As Andrej Karpathy points out,   
   
Tokenization : (   
Tokenization is at the heart of much weirdness of LLMs. Do not brush it off.   
- Why can't LLM spell words? Tokenization.   
- Why can't LLM do super simple string processing tasks like reversing a string? Tokenization.   
- Why is LLM worse at non-English languages (e.g. Japanese)? Tokenization.   
- Why is LLM bad at simple arithmetic? Tokenization.   
- Why did GPT-2 have more than necessary trouble coding in Python? Tokenization.   
- Why did my LLM abruptly halt when it sees the string "<\|endoftext\|>"? Tokenization.   
- What is this weird warning I get about a "trailing whitespace"? Tokenization.   
- Why should I prefer to use YAML over JSON with LLMs? Tokenization.   
- Why is LLM not actually end-to-end language modeling? Tokenization.   
- What is the real root of suffering? Tokenization.   
   
   
   
Although what it does is pretty simple, how it does it is slightly complicated.   
For example a GPT-2 type tokenizer is a byte based tokenizer, meaning, it can also chunk "-" or quotes, special characters, which previous tokenizers like BERT would simply skip.   
   
You should give the original algorithm a read: [https://en.wikipedia.org/wiki/Byte-pair\_encoding](https://en.wikipedia.org/wiki/Byte-pair_encoding#:~:text=%5B7%5D-,Original%20algorithm,-%5Bedit%5D)    
   
To see how each tokenizer compare with each other you can use this link: [https://tiktokenizer.vercel.app/](https://tiktokenizer.vercel.app/)    
