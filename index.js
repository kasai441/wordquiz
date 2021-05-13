const wiktionary = require('wiktionary-node')
// eslint-disable-next-line no-undef
const argv = require('minimist')(process.argv)
const sqlite3 = require('sqlite3').verbose()
const { Select } = require('enquirer')

// eslint-disable-next-line no-undef
const currentDir = process.cwd()
const databaseName = `${currentDir}/wordquiz.sqlite3`
const tableName = 'words'

// const words = ['Sunday', 'jump', 'magazine', 'champion', 'king', 'ribbon', 'ciao']

class WordQuiz {
  static run () {
    if (argv.l !== undefined) {
      this.listWords()
    } else if (argv.d !== undefined) {
      this.deleteWords()
    } else {
      this.register()
    }
  }

  static async listWords () {
    const words = await Word.all(await this.allRows())
    words.forEach(word => console.log(word.displayTitle()))
  }

  static async allRows() {
    const allRows = await Storage.selectAll().catch( err => {
      console.error(err)
      process.exit(1)
    })
    if (allRows.length === 0) {
      console.log('登録されている単語がありません')
      process.exit(0)
    }
    return allRows    
  }

  static async deleteWords () {
    const allRows = await this.allRows()
    const words = await Word.all(allRows)
    const titles = words.map(word => word.displayTitle())
    console.log(titles)
    
    const prompt = new Select({
      name: '登録解除',
      message: 'どの単語を解除しますか',
      choices: titles
    })
    prompt.run()
      .then(() => {
        const selectedId = titles.find(x => x.enabled).index // titlesに選択された情報(enabled)が入っている
        const dbId = allRows[selectedId].rowid
        console.log(dbId)
        Storage.deleteBy(dbId)
      })
      .catch(console.error)
  }

  static async register () {
    let word = null
    let input_word = argv._[2]

    if (argv.u === undefined) {
      if (await Storage.exist(input_word)) {
        this.showMessage('exist')
        process.exit(0)
      }
      word = await this.fetchWictionary(input_word)
      await Storage.insert(word)
    } else {
      word = await this.fetchWictionary(argv.u)
      await Storage.update(word)
    }

    word.displayDefinitions()
    console.log('登録しました')
  }

  static async fetchWictionary (input_word) {
    const result = await wiktionary(input_word).catch(() => null)
    if (result === null || result.definitions.length === 0) {
      console.error(`${input_word} can't receive any correct definitions from Wictionary`)
      process.exit(1)
    } else {
      return new Word(result.word, result.definitions)
    }  
  }

  static showMessage (key) {
    let message
    if (key === 'exist') {
      message = 'This word already exists in the local database. To overwrite it by current Wiktionary informations, use -u option with the word.'
    }
    console.log(message)
  }
}

class Word {
  static async all (allRows) {
    return allRows.map(row =>
      new Word(
        row.name,
        JSON.parse(row.definitions),
        new Date(row.updated_at),
        new Date(row.created_at)
      )
    )
  }

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

  displayTitle () {
    return `${this.updatedAt.toLocaleDateString()} ${this.updatedAt.toLocaleTimeString().substring(0, 5)} ${this.name}`
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
    const query = `SELECT rowid, name, definitions, updated_at, created_at FROM ${tableName}`
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

  static update (word) {
    const query = `UPDATE ${tableName} SET definitions = ?, updated_at = ? WHERE name = ?;`
    const db = this.connect()
    try {
      db.serialize(function () {
        const stmt = db.prepare(query)
        stmt.run(
          JSON.stringify(word.definitions),
          word.updatedAt,
          word.name
        )
        stmt.finalize()
      })
    } catch (e) {
      return e
    } finally {
      db.close()
    }
  }

  static async exist (word_name) {
    const query = `SELECT true WHERE EXISTS(SELECT * FROM words WHERE name = ?);`
    const db = this.connect()
    return new Promise(function (resolve, reject) {
      try {
        db.get(query, word_name, function (error, result) {
          if (error) throw new Error(error)
          resolve(result)
        })
      } catch (e) {
        return reject(e)
      } finally {
        db.close()
      }
    })
  }

  static async deleteBy (idx) {
    const query = `delete from ${tableName} where rowid = (?)`
    const db = this.connect()
    return new Promise(function (resolve, reject) {
      try {
        db.serialize(function () {
          const stmt = db.prepare(query)
          stmt.run(idx)
          stmt.finalize()
        })
        return resolve()
      } catch (e) {
        return reject(e)
      } finally {
        db.close()
      }
    })
  }
}

WordQuiz.run()
