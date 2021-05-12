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
  static run () {
    if (argv.l !== undefined) {
      this.listWords()
    } else {
      this.register()
    }
  }

  static async listWords () {
    const allRows = await Storage.selectAll().catch( err => {
      console.error(err)
      process.exit(1)
    })
    if (allRows.length === 0) {
      console.log('登録されている単語がありません')
      process.exit(0)
    }
    allRows.forEach(row => {
      const word = new Word(
        row.name,
        JSON.parse(row.definitions),
        new Date(row.updated_at),
        new Date(row.created_at)
      ).displayName()
      console.log(word)
      console.log(row.updated_at)
      console.log(new Date(row.updated_at))
    })
  }

  static async register () {
    let input_word = null
    let word = null

    if (argv._.length === 3) {
      input_word = argv._[2]
    } else {
      throw new Error('不正な引数')
    }
    const result = await wiktionary(input_word).catch(() => null)
    if (result === null || result.definitions.length === 0) {
      console.error(`${input_word} can't receive any correct definitions from Wictionary`)
      process.exit(1)
    } else {
      word = new Word(result.word, result.definitions)
    }  

    await Storage.insert(word)
    word.displayDefinitions()
    console.log('登録しました')
  }
}

class Word {
  constructor (name, definitions, updatedAt = new Date(), createdAt = new Date()) {
    this.name = name
    this.definitions = definitions
    this.updatedAt = updatedAt
    this.createdAt = createdAt
  }

  displayDefinitions () {
    this.definitions.forEach(definition => {
      console.log('- ' + definition.speech)
      const lines = definition.lines
      for (let j = 0; j < 3 && j < lines.length; j++) {
        const line = lines[j]
        console.log((j + 1) + '. ' + line.define)
        if (line.examples.length > 0) console.log("'" + line.examples[0] + "'")        
      }
    })
  }

  displayName () {
    console.log(`${this.name} ${this.updatedAt}`)
  }
}

class Storage {
  static connect () {
    const db = new sqlite3.Database(databaseName)
    db.run(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        name TEXT PRIMARY KEY,
        definitions TEXT,
        updated_at NUMERIC,
        created_at NUMERIC        
      )
    `)
    return db
  }

  static async selectAll () {
    const query = `SELECT name, definitions, updated_at, created_at FROM ${tableName}`
    const db = this.connect()
    return new Promise(function (resolve, reject) {
      try {
        db.all(query, function (error, rows) {
          if (error) throw new Error(error)
          resolve(rows)
        })
      } catch (e) {
        return reject(e)
      } finally {
        db.close()
      }
    })
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
          JSON.stringify(word.definitions),
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
