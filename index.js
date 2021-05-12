const wiktionary = require('wiktionary-node')
// eslint-disable-next-line no-undef
const argv = require('minimist')(process.argv)
const sqlite3 = require('sqlite3').verbose()

// eslint-disable-next-line no-undef
const currentDir = process.cwd()
const databaseName = `${currentDir}/wordquiz.sqlite3`
const tableName = 'words'

// const words = ['Sunday', 'jump', 'magazine', 'champion', 'king', 'ribbon', 'ciao']

class WordQuiz {
  static async run () {
    let input_word = null
    if (argv._.length === 3) {
      input_word = argv._[2]
    } else {
      throw new Error('不正な引数')
    }
    const result = await wiktionary(input_word).catch(() => null)
    if (result === null || result.definitions.length === 0) {
      console.log(`${input_word} can't receive any correct definitions from Wictionary`)
    } else {
      this.register(new Word(result.name, result.definitions))
    }  
  }

  static register (word) {
    // console.log(word_data.word)

    Storage.insert(word)
    word.definitions.forEach(definition => {
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
    this.updatedAt = new Date()
    this.createdAt = new Date()
  }
}

class Storage {
  static connect () {
    const db = new sqlite3.Database(databaseName)
    db.run(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        name TEXT primary key,
        definitions TEXT,
        updated_at NUMERIC,
        created_at NUMERIC        
      )
    `)
    return db
  }

  static insert (word) {
    const query = `INSERT INTO ${tableName} (
        name,
        definitions,
        updated_at,
        created_at
      ) VALUES (?, ?, ?, ?)`
    const db = this.connect()
    try {
      db.serialize(function () {
        const stmt = db.prepare(query)
        stmt.run(
          word.name,
          word.definitions,
          word.updatedAt,
          word.createdAt
          )
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
