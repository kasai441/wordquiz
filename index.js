const wiktionary = require('wiktionary-node')
const argv = require('minimist')(process.argv)
const sqlite3 = require('sqlite3').verbose()

const words = ['Sunday', 'jump', 'magazine', 'champion', 'king', 'ribbon', 'ciao']

class WordQuiz {
  static async run () {
    let word = null
    if (argv._.length === 3) {
      word = argv._[2]
    } else {
      throw new Error('不正な引数')
    }
    const result = await wiktionary(word) 
    if (result === null) {
      console.log(`${word} is not on Wictionary`)
    } else {
      console.log(result.word)
      result.definitions.forEach(definition => {
        console.log('- ' + definition.speech)
        const lines = definition.lines
        for (let j = 0; j < 3 && j < lines.length; j++) {
          const line = lines[j]
          console.log((j + 1) + '. ' + line.define)
          if (line.examples.length > 0) console.log("'" + line.examples[0] + "'")        
        }
      })
      console.log('登録しますか')
    }  
  }
}

WordQuiz.run()
