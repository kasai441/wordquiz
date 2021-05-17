## REGISTER WORDS DEFINITONS AND QUIZ IT !
In terminal you can receive word definitions written on Wictionary. Once you get a word, it is registered in your local Sqlite3 database, from which you can randomly select a word in the form of quiz.

## INSTALL
```
$ npm install wordquiz
```

## USAGE
It works with your terminal by commanding with an argument or options.

### Register a word
Command with a word as an argument.
```
wordquiz tomato
```
If there's the word on Wictionary, you can get the definitions hiding itself by underlines as below. 
```
A word is registerd as below.

Noun
 1. A widely cultivated plant, Solanum lycopersicum, having edible fruit.
 2. The savory fruit of this plant, red when ripe, treated as a vegetable in horticulture and cooking.
  'Synonyms: love apple (informal), wolf's peach (obsolete)'
 3. A shade of red, the colour of a ripe ___.
  '___:  '
Verb
 1. (transitive) to pelt with ___es
 2. (transitive) to add ___es to (a dish)
 ```

### Overwrite definitions by current information
To overwrite and renew a word by the current Wiktionary information, use -u option with the word.
```
wordquiz -u tomato
```

### List registered words
Command with -l option.
```
wordquiz -l
```
And you got a list of words already registered in your local database.
```
2021-5-14 14:17 bun
2021-5-14 14:19 bread
2021-5-14 14:19 rice
2021-5-14 14:20 potato
2021-5-14 14:20 corn
2021-5-17 11:32 tomato
```
### Delete a registered word
Command with -d option.
```
wordquiz -d
```
You can select a word you want to delete from your database.

### Quiz words
Command without arguments nor options
```
wordquiz
```
Then you can challenge a quiz randomly selected from registered words. Answer a word to confirm you can remember it.
```
Noun
 1. The tuber of a plant, Solanum tuberosum, eaten as a starchy vegetable, particularly in the Americas and Europe; this plant.
 2. (informal, Britain) A conspicuous hole in a sock or stocking
 3. Metaphor for a person or thing of little value.
  '(slang, offensive) A mentally handicapped person.'
================
  ANSWER:
----------------
> potato
----------------
  Right!
```
## LICENSE
MIT

## KEYWORDS
