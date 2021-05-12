const wiktionary = require('wiktionary-node')
const argv = require('minimist')(process.argv)
const sqlite3 = require('sqlite3').verbose()

const currentDir = process.cwd()
const databaseName = `${currentDir}/wordquiz.sqlite3`
const tableName = 'words'

const words = ['Sunday', 'jump', 'magazine', 'champion', 'king', 'ribbon', 'ciao']

class WordQuiz {
  static async run () {
    let word = null
    if (argv._.length === 3) {
      word = argv._[2]
    } else {
      throw new Error('不正な引数')
    }
    const word_data = await wiktionary(word).catch(() => null)
    if (word_data === null || word_data.definitions.length === 0) {
      console.log(`${word} can't receive any correct definitions from Wictionary`)
    } else {
      this.register(word_data)
    }  
  }

  register (word_data) {
    console.log(word_data.word)

    Storage.insert(word_data)
    word_data.definitions.forEach(definition => {
      console.log('- ' + definition.speech)
      const lines = definition.lines
      for (let j = 0; j < 3 && j < lines.length; j++) {
        const line = lines[j]
        console.log((j + 1) + '. ' + line.define)
        if (line.examples.length > 0) console.log("'" + line.examples[0] + "'")        
      }
    })
    console.log('登録しました')
  }
}

class Word {
  constructor (name, definitions) {
    this.name = name
    this.definitions = definitions
  }
}

class Storage {
  static connect () {
    const db = new sqlite3.Database(databaseName)
    db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (content TEXT)`)
    return db
  }

  static insert (content) {
    const query = `INSERT INTO ${tableName} VALUES (?)`
    const db = this.connect()
    try {
      db.serialize(function () {
        const stmt = db.prepare(query)
        stmt.run(content)
        stmt.finalize()
      })
    } catch (e) {
      return e
    } finally {
      db.close()
    }
  }
}

WordQuiz.run()
