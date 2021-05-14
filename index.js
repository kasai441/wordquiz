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
    if (argv.l) {
      this.isData()
      this.listWords()
    } else if (argv.d) {
      this.isData()
      this.deleteWords()
    } else if (argv._.length === 3 || argv.u) {
      this.register()
    } else if (argv._.length > 3) {
      this.showMessage('excess')
    } else {
      this.isData()
      Quiz.start()
    }
  }

  static async isData () {
    const wordsLength = await Storage.wordsLength()
    if (wordsLength.count === 0) {
      console.log('No word in the database. To register a new word, command with it.')
      process.exit(0)
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
    return allRows    
  }

  static async deleteWords () {
    const allRows = await this.allRows()
    const words = await Word.all(allRows)
    const titles = words.map(word => word.displayTitle())
    
    const prompt = new Select({
      name: 'Delete',
      message: 'Select a word to delete',
      choices: titles
    })
    prompt.run()
      .then(() => {
        const selectedId = titles.find(x => x.enabled).index // titlesに選択された情報(enabled)が入っている
        const dbId = allRows[selectedId].rowid
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
    console.log('Registerd.')
  }

  static async fetchWictionary (input_word) {
    const result = await wiktionary(input_word).catch(() => null)
    if (result === null || result.definitions.length === 0) {
      console.error(`"${input_word}" can't receive any correct definitions from Wictionary`)
      process.exit(1)
    } else {
      return new Word(result.word, result.definitions)
    }  
  }

  static showMessage (key) {
    let message
    switch (key) {
      case 'exist':
        message = 'This word already exists in the database. To overwrite it by current Wiktionary informations, use -u option with the word.'
        break;
      case 'excess':
        message = 'The command argument has to be only one.'
        break;
      default:
        message = key
        break;
    }
    console.log(message)
  }
}

class Quiz {
  static async start () {
    const wordsLength = await Storage.wordsLength()
    let rownum = this.getRandomInt(0, wordsLength.count)
    const row = await Storage.findBy(rownum)
    this.word = Word.create(row)
    console.log('QUESTION:')
    console.log('  What word has these definitions?')
    console.log('='.repeat(16))
    this.word.displayDefinitions()
    console.log('='.repeat(16))
    console.log('ANSWER:')
    console.log('  Your answer is:')
    console.log('-'.repeat(16))
    await this.input()
  }

  static async input () {
    let query
    const reader = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    reader.on('line', (line) => {
      query = line
      reader.close()
    })

    reader.on('close', () => {
      this.judge(query)
    })
  }

  static judge (query) {
    if (query === this.word.name) {
      console.log('-'.repeat(16))
      console.log('  Right!')
    } else {
      console.log('-'.repeat(16))
      console.log('  The right answer is:')
      console.log('-'.repeat(16))
      console.log(this.word.name)
      console.log('-'.repeat(16))
    }
  }

  static getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }
}

class Word {
  static all (allRows) {
    return allRows.map(row => this.create(row))
  }

  static create (row) {
    return new Word(
      row.name,
      JSON.parse(row.definitions),
      new Date(row.updated_at),
      new Date(row.created_at)
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

  static async findBy (rownum) {
    const query = `SELECT * FROM ${tableName} LIMIT 1 OFFSET ?;`
    const db = this.connect()
    return new Promise(function (resolve, reject) {
      try {
        db.get(query, rownum, function (error, result) {
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

  static async exist (word_name) {
    const query = `SELECT true WHERE EXISTS(SELECT * FROM ${tableName} WHERE name = ?);`
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

  static async wordsLength () {
    const query = `SELECT COUNT(*) AS count FROM ${tableName};`
    const db = this.connect()
    return new Promise(function (resolve, reject) {
      try {
        db.get(query, function (error, result) {
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
