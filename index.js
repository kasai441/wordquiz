const wiktionary = require('wiktionary-node')

const words = ['Sunday', 'jump', 'magazine', 'champion', 'king', 'ribbon', 'ciao']

async function run () {
  for (i = 0; i < words.length; i++) {
    const result = await wiktionary(words[i]) 
    if (result === null) {
      console.log(`${words[i]} is not on Wictionary`)
    } else {
      console.log(result.word)
      result.definitions.forEach(definition => {
        console.log('- ' + definition.speech)
        const lines = definition.lines
        for (j = 0; j < 3 && j < lines.length; j++) {
          const line = lines[j]
          console.log((j + 1) + '. ' + line.define)
          if (line.examples.length > 0) console.log("'" + line.examples[0] + "'")        
        }
      })
    }
  }  
}

run()
